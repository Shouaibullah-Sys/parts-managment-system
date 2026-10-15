// app/api/suppliers/[id]/route.ts
// فروشگاه/تأمین‌کننده — دریافت، ویرایش، غیرفعال‌سازی/حذف
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { suppliers, user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { supplierSchema } from "@/lib/validation/schemas";
import { isDuplicateKeyError } from "@/lib/api-response";
import { and, eq, ilike, ne } from "drizzle-orm";

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

function parseId(raw: string): number | null {
  const id = parseInt(raw);
  return Number.isNaN(id) ? null : id;
}

// GET /api/suppliers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const supplierId = parseId(id);
    if (supplierId == null) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const [row] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch supplier" },
      { status: 500 },
    );
  }
}

// PUT /api/suppliers/[id] — ویرایش فروشگاه
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const supplierId = parseId(id);
    if (supplierId == null) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = supplierSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid data",
        },
        { status: 400 },
      );
    }

    const updates: {
      name?: string;
      phone?: string | null;
      note?: string | null;
      active?: boolean;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim();
      if (!name) {
        return NextResponse.json(
          { success: false, error: "نام فروشگاه لازم است" },
          { status: 400 },
        );
      }
      // جلوگیری از تکرار نام (به جز خود همین ردیف)
      const [clash] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(ne(suppliers.id, supplierId), ilike(suppliers.name, name)))
        .limit(1);
      if (clash) {
        return NextResponse.json(
          { success: false, error: "فروشگاهی با این نام از قبل موجود است" },
          { status: 409 },
        );
      }
      updates.name = name;
    }
    if (parsed.data.phone !== undefined)
      updates.phone = parsed.data.phone?.trim() || null;
    if (parsed.data.note !== undefined)
      updates.note = parsed.data.note?.trim() || null;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;

    try {
      const [updated] = await db
        .update(suppliers)
        .set(updates)
        .where(eq(suppliers.id, supplierId))
        .returning();

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Supplier not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: updated });
    } catch (insertErr) {
      if (isDuplicateKeyError(insertErr)) {
        return NextResponse.json(
          { success: false, error: "فروشگاهی با این نام از قبل موجود است" },
          { status: 409 },
        );
      }
      throw insertErr;
    }
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update supplier" },
      { status: 500 },
    );
  }
}

// DELETE /api/suppliers/[id] — پیش‌فرض غیرفعال‌سازی؛ ?hard=true حذف دائمی
// تاریخچه فروش‌ها به خاطر اسنپ‌شات supplier_name سالم می‌ماند.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const supplierId = parseId(id);
    if (supplierId == null) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      const deleted = await db
        .delete(suppliers)
        .where(eq(suppliers.id, supplierId))
        .returning();

      if (!deleted.length) {
        return NextResponse.json(
          { success: false, error: "Supplier not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Supplier deleted permanently",
      });
    }

    const [updated] = await db
      .update(suppliers)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(suppliers.id, supplierId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Supplier deactivated",
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete supplier" },
      { status: 500 },
    );
  }
}
