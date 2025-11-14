// app/api/init-stock/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // Get all parts
    const allParts = await db.select().from(parts);

    // Add initial stock for each part (100 units)
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
      message: `Initial stock added for ${allParts.length} parts`,
      partsCount: allParts.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
