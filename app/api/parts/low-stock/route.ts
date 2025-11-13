// app/api/parts/low-stock/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lowStockParts = await db
      .select({
        part: parts,
        currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
      })
      .from(parts)
      .leftJoin(inventory, eq(parts.id, inventory.partId))
      .where(eq(parts.active, true))
      .groupBy(parts.id)
      .having(sql`COALESCE(SUM(${inventory.change}), 0) < ${parts.minStock}`);

    return NextResponse.json({
      success: true,
      data: lowStockParts,
    });
  } catch (error) {
    console.error("Error fetching low stock parts:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
