// app/api/parts/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { listParts } from "@/lib/parts-queries";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { user, parts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const search = url.searchParams.get("search");
    const section = url.searchParams.get("section");
    const active = url.searchParams.get("active");

    const { items, pagination } = await listParts({
      page,
      limit,
      search,
      section,
      active,
    });

    // Return same shape frontend expects
    return ok(items, { pagination });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    // check role
    const [roleRow] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!roleRow || roleRow.role !== "admin") return unauthorized();

    const body = await request.json();

    if (!body?.partNumber || !body?.name) {
      return bad("Part number and name are required");
    }

    // avoid exact duplicates
    const existing = await db
      .select()
      .from(parts)
      .where(eq(parts.partNumber, body.partNumber))
      .limit(1);

    if (existing.length > 0) {
      return bad("Part number already exists");
    }

    // Validate numeric fields (optional)
    if (body.costPrice) body.costPrice = parseFloat(String(body.costPrice));
    if (body.salePrice) body.salePrice = parseFloat(String(body.salePrice));
    if (body.minStock) body.minStock = parseInt(String(body.minStock), 10);

    const [inserted] = await db.insert(parts).values(body).returning();

    return ok(inserted, {
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  } catch (err) {
    return serverError(err);
  }
}
