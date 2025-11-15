// app/api/parts/search/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000");

    console.log("🔍 Fetching parts for search with limit:", limit);

    // Try to get parts with direct currentStock first (post-migration)
    // Fallback to inventory calculation if column doesn't exist
    let partsWithStock;

    try {
      // Attempt to use current_stock column (new structure)
      partsWithStock = await db
        .select({
          id: parts.id,
          partNumber: parts.partNumber,
          name: parts.name,
          section: parts.section,
          minStock: parts.minStock,
          costPrice: parts.costPrice,
          salePrice: parts.salePrice,
          active: parts.active,
          createdAt: parts.createdAt,
          currentStock: parts.currentStock, // Use direct column
        })
        .from(parts)
        .where(eq(parts.active, true))
        .orderBy(parts.partNumber)
        .limit(limit);

      console.log("✅ Using current_stock column from parts table");
    } catch (error) {
      console.log(
        "current_stock column not found, using inventory calculation..."
      );
      // Fallback to inventory transaction calculation (old structure)
      partsWithStock = await db
        .select({
          id: parts.id,
          partNumber: parts.partNumber,
          name: parts.name,
          section: parts.section,
          minStock: parts.minStock,
          costPrice: parts.costPrice,
          salePrice: parts.salePrice,
          active: parts.active,
          createdAt: parts.createdAt,
          currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
        })
        .from(parts)
        .leftJoin(inventory, eq(parts.id, inventory.partId))
        .where(eq(parts.active, true))
        .groupBy(
          parts.id,
          parts.partNumber,
          parts.name,
          parts.section,
          parts.minStock,
          parts.costPrice,
          parts.salePrice,
          parts.active,
          parts.createdAt
        )
        .orderBy(parts.partNumber)
        .limit(limit);
    }

    console.log(`✅ Loaded ${partsWithStock.length} parts for search`);

    // Log stock information for debugging
    partsWithStock.slice(0, 5).forEach((part) => {
      console.log(
        `📦 ${part.partNumber}: ${part.name} - Stock: ${part.currentStock}, Min: ${part.minStock}`
      );
    });

    return Response.json({
      success: true,
      data: partsWithStock,
      count: partsWithStock.length,
    });
  } catch (error) {
    console.error("❌ Error in parts search API:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch parts for search",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
