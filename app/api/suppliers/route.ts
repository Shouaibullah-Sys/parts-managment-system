// app/api/suppliers/route.ts
// فروشگاه‌ها / تأمین‌کنندگان — برای پرزه خارجی (افزودن پرزه از فروشگاه دیگر)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { suppliers, user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { supplierSchema } from "@/lib/validation/schemas";
import { isDuplicateKeyError } from "@/lib/api-response";
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

// GET /api/suppliers — لیست/جستجوی فروشگاه‌ها (هر کاربر واردشده)
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
    const search = searchParams.get("search") || "";
    const active = searchParams.get("active");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(suppliers.name, `%${search}%`),
          ilike(suppliers.phone, `%${search}%`),
        ),
      );
    }
    if (active === "true") whereConditions.push(eq(suppliers.active, true));
    if (active === "false") whereConditions.push(eq(suppliers.active, false));

    const whereClause = whereConditions.length
      ? and(...whereConditions)
      : undefined;

    const rows = await db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(desc(suppliers.createdAt))
      .limit(limit);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}

// POST /api/suppliers — ایجاد فروشگاه جدید (هر کاربر واردشده؛ از دیالوگ پرزه خارجی)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid data",
        },
        { status: 400 },
      );
    }

    const name = parsed.data.name.trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "نام فروشگاه لازم است" },
        { status: 400 },
      );
    }

    // جلوگیری از دوباره‌کاری با نام تکراری (لاسکی خالی)
    const [existing] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(ilike(suppliers.name, name))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "فروشگاهی با این نام از قبل موجود است" },
        { status: 409 },
      );
    }

    try {
      const [created] = await db
        .insert(suppliers)
        .values({
          name,
          phone: parsed.data.phone?.trim() || null,
          note: parsed.data.note?.trim() || null,
          active: parsed.data.active ?? true,
        })
        .returning();

      return NextResponse.json(
        { success: true, data: created },
        { status: 201 },
      );
    } catch (insertErr) {
      if (isDuplicateKeyError(insertErr)) {
        return NextResponse.json(
          { success: false, error: "فروشگاهی با این نام از قبل موجود است" },
          { status: 409 },
        );
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("Error creating supplier:", err);
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد فروشگاه" },
      { status: 500 },
    );
  }
}
