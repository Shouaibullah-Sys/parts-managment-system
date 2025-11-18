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

    // Process updates without transactions (Neon HTTP driver doesn't support transactions)
    const updateResults = [];
    const errors = [];

    for (const item of body) {
      if (item.requested_quantity > 0) {
        try {
          // Update part current stock
          const updatedPart = await db
            .update(parts)
            .set({
              currentStock: item.current_stock + item.requested_quantity,
            })
            .where(eq(parts.id, item.id))
            .returning();

          if (updatedPart.length > 0) {
            // Create inventory transaction record
            await db.insert(inventory).values({
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
        } catch (itemError) {
          console.error(`Error updating part ${item.id}:`, itemError);
          errors.push({
            id: item.id,
            part_number: item.part_number,
            error:
              itemError instanceof Error ? itemError.message : "Unknown error",
          });
        }
      }
    }

    const results = updateResults;

    // Log any errors for debugging
    if (errors.length > 0) {
      console.warn(
        `Bulk update completed with ${errors.length} errors:`,
        errors
      );
    }

    return Response.json({
      success: results.length > 0,
      message:
        errors.length === 0
          ? `Successfully updated ${results.length} parts`
          : `Updated ${results.length} parts with ${errors.length} errors`,
      data: {
        updated: results,
        errors: errors,
        summary: {
          totalProcessed: body.filter((item) => item.requested_quantity > 0)
            .length,
          successful: results.length,
          failed: errors.length,
        },
      },
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    return Response.json(
      { success: false, error: "Failed to update parts" },
      { status: 500 }
    );
  }
}
