// lib/parts-queries.ts
import { db } from "@/db/drizzle";
import { parts, inventory, partners } from "@/db/schema";
import { eq, and, or, like, inArray, sql } from "drizzle-orm";

export type PartPartnerInfo = {
  id: number;
  name: string;
  percentage: string | null;
};

/**
 * واکشی اطلاعات شرکای انتخابشده برای چند قطعه در یک کوئری.
 * @returns نقشهای از شناسه شریک به اطلاعات آن
 */
export async function getPartnersMap(
  partnerIds: Array<number | null | undefined>,
): Promise<Map<number, PartPartnerInfo>> {
  const map = new Map<number, PartPartnerInfo>();
  const uniqueIds = [...new Set(partnerIds.filter((id): id is number => !!id))];
  if (!uniqueIds.length) return map;

  const rows = await db
    .select({
      id: partners.id,
      name: partners.name,
      percentage: partners.percentage,
    })
    .from(partners)
    .where(inArray(partners.id, uniqueIds));

  for (const row of rows) {
    map.set(row.id, row);
  }

  return map;
}

export async function listParts(opts: {
  page?: number;
  limit?: number;
  search?: string | null;
  active?: string | null;
}) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 25;
  const offset = (page - 1) * limit;

  const whereConditions: any[] = [];

  if (opts.search) {
    const q = opts.search.trim();
    if (q.length) {
      whereConditions.push(
        sql`LOWER(p.part_number) LIKE LOWER(${`%${q}%`}) OR LOWER(p.name) LIKE LOWER(${`%${q}%`})`,
      );
    }
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
    db.execute(sql`
      SELECT
        p.id,
        p.part_number AS "partNumber",
        p.name,
        p.shelf,
        p.min_stock AS "minStock",
        p.cost_price AS "costPrice",
        p.sale_price AS "salePrice",
        p.active,
        p.created_at AS "createdAt",
        p.current_stock AS "currentStock"
      FROM parts p
      ${whereClause ? sql`WHERE ${whereClause}` : sql``}
      ORDER BY p.part_number
      LIMIT ${limit} OFFSET ${offset}
    `),
    db
      .select({ count: sql<number>`count(*)` })
      .from(parts)
      .where(whereClause),
  ]);

  const total = Number(countRes?.[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items: items.rows || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getPartById(
  id: number,
): Promise<Record<string, any> | null> {
  const res = await db.execute(sql`
    SELECT
      p.id,
      p.part_number AS "partNumber",
      p.name,
      p.shelf,
      p.min_stock AS "minStock",
      p.cost_price AS "costPrice",
      p.sale_price AS "salePrice",
      p.active,
      p.created_at AS "createdAt",
      p.current_stock AS "currentStock",
      p.partner_id AS "partnerId"
    FROM parts p
    WHERE p.id = ${id}
    LIMIT 1
  `);
  const row = res.rows?.[0] as Record<string, any> | undefined;
  if (!row) return null;

  const partnerId = row.partnerId != null ? Number(row.partnerId) : null;
  const partnersMap = await getPartnersMap([partnerId]);

  return {
    ...row,
    partner: partnerId ? (partnersMap.get(partnerId) ?? null) : null,
  };
}

export async function lowStockParts() {
  const res = await db.execute(sql`
    SELECT
      p.id,
      p.part_number AS "partNumber",
      p.name,
      p.shelf,
      p.min_stock AS "minStock",
      p.cost_price AS "costPrice",
      p.sale_price AS "salePrice",
      p.active,
      p.created_at AS "createdAt",
      p.current_stock AS "currentStock"
    FROM parts p
    WHERE p.active = true AND p.current_stock < p.min_stock
    ORDER BY p.part_number
  `);
  return res.rows || [];
}

export async function getPartInventoryHistory(
  partId: number,
  page = 1,
  limit = 20,
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
