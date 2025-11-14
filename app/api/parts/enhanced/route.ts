// app/api/parts/enhanced/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, inventory, sales } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "popular":
        return getPopularParts();
      case "frequently-issued":
        return getFrequentlyIssuedParts();
      case "low-stock":
        return getLowStockParts();
      default:
        return bad("Invalid action");
    }
  } catch (err) {
    return serverError(err);
  }
}

async function getPopularParts() {
  // Get parts that are frequently searched or issued together
  const popularParts = await db
    .select({
      part: parts,
      issueCount: sql<number>`COUNT(${sales.id})`,
      currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
    })
    .from(parts)
    .leftJoin(sales, eq(parts.id, sales.partId))
    .leftJoin(inventory, eq(parts.id, inventory.partId))
    .groupBy(parts.id)
    .orderBy(desc(sql`COUNT(${sales.id})`))
    .limit(10);

  return ok(popularParts);
}

async function getFrequentlyIssuedParts() {
  // Get parts that are frequently issued together (association rules)
  const frequentItems = await db
    .select({
      partId: sales.partId,
      customerId: sales.customerId,
      issueDate: sales.saleDate,
    })
    .from(sales)
    .orderBy(sales.saleDate)
    .limit(1000);

  // Simple association rule mining
  const associations = mineAssociations(frequentItems);

  return ok(associations);
}

async function getLowStockParts() {
  const lowStock = await db
    .select({
      part: parts,
      currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
      minStock: parts.minStock,
    })
    .from(parts)
    .leftJoin(inventory, eq(parts.id, inventory.partId))
    .groupBy(parts.id)
    .having(sql`COALESCE(SUM(${inventory.change}), 0) < ${parts.minStock}`)
    .orderBy(sql`COALESCE(SUM(${inventory.change}), 0)`);

  return ok(lowStock);
}

function mineAssociations(transactions: any[]) {
  // Simple association rule mining for frequently bought together items
  const itemCounts = new Map();
  const pairCounts = new Map();

  transactions.forEach((transaction) => {
    const items = transactions
      .filter((t) => t.customerId === transaction.customerId)
      .map((t) => t.partId);

    items.forEach((item) => {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    });

    // Count pairs
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const pair = [items[i], items[j]].sort().join("-");
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }
    }
  });

  // Calculate confidence scores
  const associations = [];
  for (const [pair, count] of pairCounts.entries()) {
    const [itemA, itemB] = pair.split("-").map(Number);
    const support = count / transactions.length;
    const confidence = count / itemCounts.get(itemA);

    if (support > 0.01 && confidence > 0.3) {
      // Thresholds
      associations.push({
        itemA,
        itemB,
        support,
        confidence,
        lift: confidence / (itemCounts.get(itemB) / transactions.length),
      });
    }
  }

  return associations.sort((a, b) => b.confidence - a.confidence);
}
