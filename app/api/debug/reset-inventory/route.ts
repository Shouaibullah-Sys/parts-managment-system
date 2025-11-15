// app/api/debug/reset-inventory/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { inventory, parts } from "@/db/schema";
import { requireAuth } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { partId, targetStock } = await request.json();

    if (!partId || targetStock === undefined) {
      return NextResponse.json(
        { success: false, error: "partId and targetStock are required" },
        { status: 400 }
      );
    }

    // Get current stock
    const currentStockResult = await db
      .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
      .from(inventory)
      .where(eq(inventory.partId, parseInt(partId)));

    const currentStock = Number(currentStockResult[0]?.stock || 0);

    // Calculate the adjustment needed
    const adjustment = targetStock - currentStock;

    if (adjustment !== 0) {
      // Add adjustment transaction
      await db.insert(inventory).values({
        partId: parseInt(partId),
        change: adjustment,
        reason: "stock_adjustment",
        createdBy: session.user.id,
      });
    }

    // Verify new stock
    const newStockResult = await db
      .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
      .from(inventory)
      .where(eq(inventory.partId, parseInt(partId)));

    return NextResponse.json({
      success: true,
      message: `Adjusted stock for part ${partId} from ${currentStock} to ${targetStock}`,
      currentStock: Number(newStockResult[0]?.stock || 0),
    });
  } catch (error: unknown) {
    console.error("Error resetting inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
