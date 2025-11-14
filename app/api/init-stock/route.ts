// app/api/init-stock/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { inventory, parts } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    // Check if already initialized
    const existingStock = await db.select().from(inventory).limit(1);

    if (existingStock.length > 0) {
      return bad("Stock already initialized");
    }

    // Get all parts and add initial stock
    const allParts = await db.select().from(parts);

    for (const part of allParts) {
      await db.insert(inventory).values({
        partId: part.id,
        change: 100,
        reason: "initial_stock",
        referenceId: null,
        createdBy: session.user.id,
      });
    }

    return ok({
      message: `Initialized stock for ${allParts.length} parts`,
      count: allParts.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
