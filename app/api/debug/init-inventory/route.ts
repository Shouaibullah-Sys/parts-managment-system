// app/api/debug/init-inventory/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { inventory, parts } from "@/db/schema";
import { requireAuth } from "@/lib/auth-session";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

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

    // Get all active parts
    const allParts = await db
      .select()
      .from(parts)
      .where(eq(parts.active, true));

    let results = [];

    // Add initial inventory for each part
    for (const part of allParts) {
      const initialStock = 100; // Default initial stock

      await db.insert(inventory).values({
        partId: part.id,
        change: initialStock,
        reason: "initial_stock",
        createdBy: session.user.id, // Use authenticated user ID
      });

      results.push({
        partId: part.id,
        partNumber: part.partNumber,
        name: part.name,
        initialStock: initialStock,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Initialized inventory for ${results.length} parts`,
      results,
    });
  } catch (error: unknown) {
    console.error("Error initializing inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
