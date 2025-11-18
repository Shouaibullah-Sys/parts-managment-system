// app/api/parts/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { eq, sql, and, or, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          like(parts.partNumber, `%${search}%`),
          like(parts.name, `%${search}%`)
        )
      );
    }
    whereConditions.push(eq(parts.active, true));

    // Parts query using currentStock column directly
    const partsData = await db.execute(sql`
      SELECT
        p.id,
        p.part_number AS "partNumber",
        p.name,
        p.section,
        p.min_stock AS "minStock",
        p.cost_price AS "costPrice",
        p.sale_price AS "salePrice",
        p.active,
        p.created_at AS "createdAt",
        p.current_stock AS "currentStock"
      FROM parts p
      WHERE p.active = true
      ${search ? sql`AND (${or(like(parts.partNumber, `%${search}%`), like(parts.name, `%${search}%`))})` : sql``}
      ORDER BY p.part_number
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(parts)
      .where(and(...whereConditions));

    const total = Number(countResult[0]?.count || 0);

    return Response.json({
      success: true,
      data: partsData.rows || partsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in parts API:", error);
    return Response.json(
      { success: false, error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      partNumber,
      name,
      section,
      minStock,
      currentStock,
      costPrice,
      salePrice,
    } = body;

    if (!partNumber || !name) {
      return Response.json(
        { success: false, error: "Part number and name are required" },
        { status: 400 }
      );
    }

    // Insert the new part
    const newPart = await db
      .insert(parts)
      .values({
        partNumber,
        name,
        section: section || "E",
        minStock: minStock || 0,
        currentStock: currentStock || 0,
        costPrice: costPrice || null,
        salePrice: salePrice || null,
        active: true,
      })
      .returning();

    return Response.json({
      success: true,
      data: newPart[0],
      message: "Part created successfully",
    });
  } catch (error) {
    console.error("Error creating part:", error);

    // Check for duplicate part number
    if (
      error instanceof Error &&
      error.message.includes("duplicate key value")
    ) {
      return Response.json(
        { success: false, error: "Part number already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, error: "Failed to create part" },
      { status: 500 }
    );
  }
}
