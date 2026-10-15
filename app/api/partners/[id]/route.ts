// app/api/partners/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { partners, user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { partnerSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";

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

// GET /api/partners/[id]
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
    const partnerId = parseInt(id);
    if (Number.isNaN(partnerId)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const [row] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Partner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("Error fetching partner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch partner" },
      { status: 500 },
    );
  }
}

// PATCH /api/partners/[id] — update a partner (admin only)
export async function PATCH(
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
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const partnerId = parseInt(id);
    if (Number.isNaN(partnerId)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = partnerSchema.partial().safeParse(body);
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
      percentage?: string | null;
      active?: boolean;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.phone !== undefined)
      updates.phone = parsed.data.phone?.trim() || null;
    if (parsed.data.note !== undefined)
      updates.note = parsed.data.note?.trim() || null;
    if (parsed.data.percentage !== undefined)
      updates.percentage =
        parsed.data.percentage != null
          ? String(parsed.data.percentage)
          : null;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;

    const [updated] = await db
      .update(partners)
      .set(updates)
      .where(eq(partners.id, partnerId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Partner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating partner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update partner" },
      { status: 500 },
    );
  }
}

// DELETE /api/partners/[id] — deactivate (default) or hard-delete (?hard=true)
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
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const partnerId = parseInt(id);
    if (Number.isNaN(partnerId)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      const deleted = await db
        .delete(partners)
        .where(eq(partners.id, partnerId))
        .returning();

      if (!deleted.length) {
        return NextResponse.json(
          { success: false, error: "Partner not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Partner deleted permanently",
      });
    }

    const [updated] = await db
      .update(partners)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(partners.id, partnerId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Partner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Partner deactivated",
    });
  } catch (error) {
    console.error("Error deleting partner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete partner" },
      { status: 500 },
    );
  }
}
