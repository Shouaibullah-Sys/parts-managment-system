// app/api/parts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory, user } from "@/db/schema";
import { eq, and, or, like, sql } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const section = searchParams.get("section");
    const active = searchParams.get("active");

    const offset = (page - 1) * limit;

    let whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(parts.partNumber, `%${search}%`),
          like(parts.name, `%${search}%`)
        )
      );
    }

    if (section) {
      whereConditions.push(eq(parts.section, section as any));
    }

    if (active !== undefined) {
      whereConditions.push(eq(parts.active, active === "true"));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [partsList, totalCount] = await Promise.all([
      db
        .select()
        .from(parts)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(parts.partNumber),

      db
        .select({ count: sql<number>`count(*)` })
        .from(parts)
        .where(whereClause),
    ]);

    return NextResponse.json({
      success: true,
      data: partsList,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user role from database
    const [userWithRole] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userWithRole || userWithRole.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partData = await request.json();

    if (!partData.partNumber || !partData.name) {
      return NextResponse.json(
        { success: false, error: "Part number and name are required" },
        { status: 400 }
      );
    }

    // Check if part number already exists
    const existingPart = await db
      .select()
      .from(parts)
      .where(eq(parts.partNumber, partData.partNumber))
      .limit(1);

    if (existingPart.length > 0) {
      return NextResponse.json(
        { success: false, error: "Part number already exists" },
        { status: 400 }
      );
    }

    // Validate prices
    if (partData.costPrice && partData.salePrice) {
      const cost = parseFloat(partData.costPrice);
      const sale = parseFloat(partData.salePrice);

      if (sale < cost) {
        return NextResponse.json(
          {
            success: false,
            error: "Sale price cannot be less than cost price",
          },
          { status: 400 }
        );
      }
    }

    const [newPart] = await db.insert(parts).values(partData).returning();

    return NextResponse.json({ success: true, data: newPart }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating part:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 400 }
    );
  }
}
