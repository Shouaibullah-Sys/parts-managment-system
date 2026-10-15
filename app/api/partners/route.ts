// app/api/partners/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { partners, user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { partnerSchema } from "@/lib/validation/schemas";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

async function getCurrentUser(request: NextRequest) {
  const sessionData = await getSessionFromRequest(request);
  if (!sessionData?.user) return null;

  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionData.user.id))
    .limit(1);

  return currentUser ?? null;
}

// GET /api/partners — list partners (any authenticated user)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const active = searchParams.get("active");
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(partners.name, `%${search}%`),
          ilike(partners.phone, `%${search}%`),
        ),
      );
    }
    if (active === "true") whereConditions.push(eq(partners.active, true));
    if (active === "false") whereConditions.push(eq(partners.active, false));

    const whereClause = whereConditions.length
      ? and(...whereConditions)
      : undefined;

    const rows = await db
      .select()
      .from(partners)
      .where(whereClause)
      .orderBy(desc(partners.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await db
      .select({ value: count() })
      .from(partners)
      .where(whereClause);

    const total = Number(totalRow?.value || 0);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch partners" },
      { status: 500 },
    );
  }
}

// POST /api/partners — create a partner (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = partnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid data",
        },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(partners)
      .values({
        name: parsed.data.name.trim(),
        phone: parsed.data.phone?.trim() || null,
        note: parsed.data.note?.trim() || null,
        percentage:
          parsed.data.percentage != null
            ? String(parsed.data.percentage)
            : null,
        active: parsed.data.active ?? true,
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating partner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create partner" },
      { status: 500 },
    );
  }
}
