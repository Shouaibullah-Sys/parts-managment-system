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
import { parts, user, inventory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

    const stock = await db
      .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
      .from(inventory)
      .where(eq(inventory.partId, numericId));

    const currentStock = Number(stock?.[0]?.stock || 0);

    return ok({
      ...part,
      currentStock: stock[0]?.stock || 0,
      isLowStock: (stock[0]?.stock || 0) < (part.minStock || 0),
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
