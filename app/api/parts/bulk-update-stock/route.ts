// app/api/parts/bulk-update-stock/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!Array.isArray(body)) {
      return Response.json(
        { success: false, error: "Expected array of items" },
        { status: 400 }
      );
    }

    // Start a transaction
    const results = await db.transaction(async (tx) => {
      const updateResults = [];

      for (const item of body) {
        if (item.requested_quantity > 0) {
          // Update part current stock
          const updatedPart = await tx
            .update(parts)
            .set({
              currentStock: item.current_stock + item.requested_quantity,
            })
            .where(eq(parts.id, item.id))
            .returning();

          // Create inventory transaction record
          await tx.insert(inventory).values({
            partId: item.id,
            change: item.requested_quantity,
            reason: "import",
            referenceId: null,
            createdBy: session.user.id,
          });

          updateResults.push({
            id: item.id,
            part_number: item.part_number,
            previous_stock: item.current_stock,
            new_stock: item.current_stock + item.requested_quantity,
            added_quantity: item.requested_quantity,
          });
        }
      }

      return updateResults;
    });

    return Response.json({
      success: true,
      message: `Successfully updated ${results.length} parts`,
      data: results,
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    return Response.json(
      { success: false, error: "Failed to update parts" },
      { status: 500 }
    );
  }
}
