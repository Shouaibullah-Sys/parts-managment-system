// app/api/debug/stock-check/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get all parts with their actual stock from database
    const partsStock = await db
      .select({
        id: parts.id,
        partNumber: parts.partNumber,
        name: parts.name,
        minStock: parts.minStock,
        currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
      })
      .from(parts)
      .leftJoin(inventory, eq(parts.id, inventory.partId))
      .groupBy(parts.id, parts.partNumber, parts.name, parts.minStock)
      .orderBy(parts.id);

    console.log("📊 Database Stock Check:");
    partsStock.forEach((part) => {
      console.log(
        `   ${part.partNumber}: ${part.name} - Stock: ${part.currentStock}, Min: ${part.minStock}`
      );
    });

    return Response.json({
      success: true,
      data: partsStock,
      message: `Checked ${partsStock.length} parts`,
    });
  } catch (error) {
    console.error("❌ Error in stock check:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to check stock",
      },
      { status: 500 }
    );
  }
}
