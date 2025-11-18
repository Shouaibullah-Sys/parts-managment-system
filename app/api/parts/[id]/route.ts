// app/api/parts/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getPartById } from "@/lib/parts-queries";
import { requireAuth } from "@/lib/auth-session";
import {
  ok,
  bad,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId) return bad("Invalid ID");

    const part = await getPartById(numericId);
    if (!part) return notFound("Part not found");

    // Use the currentStock from parts table instead of calculating from inventory
    const currentStock = Number(part.currentStock || 0);

    return ok({
      ...part,
      currentStock: currentStock,
      isLowStock: currentStock < (Number(part.minStock) || 0),
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    // role check
    const [roleRow] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!roleRow || roleRow.role !== "admin") return unauthorized();

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId) return bad("Invalid ID");

    const body = await request.json();

    const [existing] = await db
      .select()
      .from(parts)
      .where(eq(parts.id, numericId))
      .limit(1);
    if (!existing) return notFound("Part not found");

    // if partNumber changed ensure uniqueness
    if (body.partNumber && body.partNumber !== existing.partNumber) {
      const [dup] = await db
        .select()
        .from(parts)
        .where(eq(parts.partNumber, body.partNumber))
        .limit(1);
      if (dup) return bad("Part number already exists");
    }

    const [updated] = await db
      .update(parts)
      .set(body)
      .where(eq(parts.id, numericId))
      .returning();
    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    // role check - allow both admin and staff for priority actions
    const [roleRow] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!roleRow) return unauthorized();

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId) return bad("Invalid ID");

    const body = await request.json();
    const { section, cost_price, sale_price } = body;

    // Build update object
    const updateData: any = {};
    if (section !== undefined) updateData.section = section;
    if (cost_price !== undefined) updateData.costPrice = cost_price;
    if (sale_price !== undefined) updateData.salePrice = sale_price;

    if (Object.keys(updateData).length === 0) {
      return bad("No valid fields to update");
    }

    // Get the existing part to know the part number
    const [existingPart] = await db
      .select()
      .from(parts)
      .where(eq(parts.id, numericId))
      .limit(1);

    if (!existingPart) return notFound("Part not found");

    // Update all parts with the same part number
    const updatedParts = await db
      .update(parts)
      .set(updateData)
      .where(eq(parts.partNumber, existingPart.partNumber))
      .returning();

    return ok({
      updatedCount: updatedParts.length,
      data: updatedParts,
      message: `Successfully updated ${updatedParts.length} parts with part number ${existingPart.partNumber}`,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    // role check
    const [roleRow] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!roleRow || roleRow.role !== "admin") return unauthorized();

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId) return bad("Invalid ID");

    const [deleted] = await db
      .update(parts)
      .set({ active: false })
      .where(eq(parts.id, numericId))
      .returning();
    if (!deleted) return notFound("Part not found");

    return ok(deleted);
  } catch (err) {
    return serverError(err);
  }
}
