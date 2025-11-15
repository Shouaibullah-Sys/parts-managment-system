// lib/parts-queries.ts
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { eq, and, or, like, sql } from "drizzle-orm";

export async function listParts(opts: {
  page?: number;
  limit?: number;
  search?: string | null;
  section?: string | null;
  active?: string | null;
}) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 10;
  const offset = (page - 1) * limit;

  const whereConditions: any[] = [];

  if (opts.search) {
    const q = opts.search.trim();
    if (q.length) {
      whereConditions.push(
        or(like(parts.partNumber, `%${q}%`), like(parts.name, `%${q}%`))
      );
    }
  }

  if (opts.section) {
    const s = opts.section.trim();
    if (s.length) whereConditions.push(eq(parts.section, s as any));
  }

  if (opts.active !== undefined && opts.active !== null) {
    // opts.active expected as "true" | "false" | undefined
    if (opts.active === "true" || opts.active === "false") {
      whereConditions.push(eq(parts.active, opts.active === "true"));
    }
  }

  const whereClause = whereConditions.length
    ? and(...whereConditions)
    : undefined;

  const [items, countRes] = await Promise.all([
    db
      .select()
      .from(parts)
      .where(whereClause)
      .orderBy(parts.partNumber)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(parts)
      .where(whereClause),
  ]);

  const total = Number(countRes?.[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getPartById(id: number) {
  const res = await db.select().from(parts).where(eq(parts.id, id)).limit(1);
  return res[0] ?? null;
}

export async function lowStockParts() {
  return db
    .select({
      part: parts,
      currentStock: parts.currentStock,
    })
    .from(parts)
    .where(
      and(
        eq(parts.active, true),
        sql`${parts.currentStock} < ${parts.minStock}`
      )
    )
    .orderBy(parts.partNumber);
}

export async function getPartInventoryHistory(
  partId: number,
  page = 1,
  limit = 20
) {
  const offset = (page - 1) * limit;

  const [rows, countRes] = await Promise.all([
    db
      .select()
      .from(inventory)
      .where(eq(inventory.partId, partId))
      .orderBy(inventory.createdAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventory)
      .where(eq(inventory.partId, partId)),
  ]);

  const total = Number(countRes?.[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    history: rows,
    pagination: { page, limit, total, totalPages },
  };
}
