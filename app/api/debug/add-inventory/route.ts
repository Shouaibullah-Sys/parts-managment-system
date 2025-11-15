// app/api/debug/add-inventory/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { inventory } from "@/db/schema";
import { requireAuth } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { partId, quantity = 100 } = await request.json();

    if (!partId) {
      return NextResponse.json(
        { success: false, error: "partId is required" },
        { status: 400 }
      );
    }

    // Add inventory using the authenticated user's ID
    await db.insert(inventory).values({
      partId: parseInt(partId),
      change: parseInt(quantity),
      reason: "initial_stock",
      createdBy: session.user.id, // Use the actual user ID
    });

    // Verify current stock
    const stockResult = await db
      .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
      .from(inventory)
      .where(eq(inventory.partId, parseInt(partId)));

    return NextResponse.json({
      success: true,
      message: `Added ${quantity} units to part ${partId}`,
      currentStock: Number(stockResult[0]?.stock || 0),
    });
  } catch (error: unknown) {
    console.error("Error adding inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
