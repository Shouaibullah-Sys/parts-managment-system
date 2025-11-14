// app/api/parts/[id]/stock/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import {
  ok,
  bad,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { inventory, parts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId) return bad("Invalid ID");

    // Get current stock from inventory transactions
    const stockResult = await db
      .select({
        stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
        partNumber: parts.partNumber,
        partName: parts.name,
      })
      .from(inventory)
      .innerJoin(parts, eq(inventory.partId, parts.id))
      .where(eq(inventory.partId, numericId))
      .groupBy(parts.id, parts.partNumber, parts.name);

    const currentStock =
      stockResult.length > 0 ? Number(stockResult[0].stock) : 0;

    return ok({
      partId: numericId,
      currentStock,
      partNumber: stockResult[0]?.partNumber || "",
      partName: stockResult[0]?.partName || "",
    });
  } catch (err) {
    return serverError(err);
  }
}
