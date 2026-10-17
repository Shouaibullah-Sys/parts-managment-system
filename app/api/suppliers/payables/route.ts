// app/api/suppliers/payables/route.ts
// قابل پرداخت به فروشگاه‌های خارجی — بهای خرید پرزه‌های خارجی (part_id IS NULL)
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { sales } from "@/db/schema";
import { and, isNull, eq, gte, lte, sql } from "drizzle-orm";
import { parseISO, isValid } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dateConditions(url: URL) {
  const period = url.searchParams.get("period") || "lifetime";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const today = new Date();
  const conditions = [];

  if (period === "today") {
    const s = new Date(today);
    s.setHours(0, 0, 0, 0);
    conditions.push(gte(sales.saleDate, s));
  } else if (period === "week") {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    s.setHours(0, 0, 0, 0);
    conditions.push(gte(sales.saleDate, s));
  } else if (period === "month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    conditions.push(gte(sales.saleDate, s));
  }

  if (from && isValid(parseISO(from))) {
    conditions.push(gte(sales.saleDate, parseISO(from)));
  }
  if (to && isValid(parseISO(to))) {
    const end = parseISO(to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(sales.saleDate, end));
  }

  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);

    const rows = await db
      .select({
        supplierId: sales.supplierId,
        supplierName: sales.supplierName,
        lineCount: sql<number>`count(*)::int`,
        quantity: sql<number>`COALESCE(SUM(${sales.quantity}), 0)::int`,
        cost: sql<string>`COALESCE(SUM(COALESCE(${sales.itemCost}, ${sales.unitCost}, 0) * ${sales.quantity}), 0)`,
        sale: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      })
      .from(sales)
      .where(
        and(
          isNull(sales.partId),
          isNull(sales.returnedAt),
          eq(sales.status, "final"),
          ...dateConditions(url)
        )
      )
      .groupBy(sales.supplierId, sales.supplierName)
      .orderBy(
        sql`SUM(COALESCE(${sales.itemCost}, ${sales.unitCost}, 0) * ${sales.quantity}) DESC`
      );

    const suppliers = rows.map((r) => {
      const cost = Number(r.cost || 0);
      const sale = Number(r.sale || 0);
      return {
        supplierId: r.supplierId,
        supplierName: r.supplierName || "نامشخص",
        lineCount: Number(r.lineCount || 0),
        quantity: Number(r.quantity || 0),
        cost,
        sale,
        margin: sale - cost,
      };
    });

    const total = suppliers.reduce((s, r) => s + r.cost, 0);
    const totalSale = suppliers.reduce((s, r) => s + r.sale, 0);

    return ok({ total, totalSale, margin: totalSale - total, suppliers });
  } catch (err) {
    return serverError(err);
  }
}
