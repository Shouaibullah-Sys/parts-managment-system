// app/api/parts/records/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // Increase timeout to 30 seconds on Vercel

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { sales, customers, user, parts } from "@/db/schema";
import { desc, sql, eq, and, like, or, inArray, type SQL } from "drizzle-orm";

// نمایش شماره فاکتور: تایپ‌شده هنگام صدور، وگرنه INV-{customerId}
// (دقیقاً همان چیزی که فاکتور PDF چاپ می‌کند)
function invoiceNumberFor(
  typed: string | null,
  customerId: number | null,
): string {
  if (typed && typed.trim() !== "") return typed.trim();
  const n = customerId ?? 0;
  return `INV-${String(n).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const search = url.searchParams.get("search");

    const offset = (page - 1) * limit;

    // شرط جستجو (روی نام مشتری / قطعه / شماره قطعه / نام پرزه خارجی)
    const searchConditions: (SQL | undefined)[] = [];
    if (search) {
      searchConditions.push(
        or(
          like(customers.name, `%${search}%`),
          like(customers.normalizedName, `%${search}%`),
          like(parts.name, `%${search}%`),
          like(parts.partNumber, `%${search}%`),
          like(sales.itemName, `%${search}%`),
          like(sales.invoiceNumber, `%${search}%`),
        ),
      );
    }
    // پیش‌نویس‌ها در سوابق/بل نمایش داده نمی‌شوند؛ فقط اسناد نهایی.
    const where = and(eq(sales.status, "final"), ...searchConditions);

    // یک ردیف = یک صدور (issue)؛ همهٔ قلم‌های یک بل با هم
    const groups = await db
      .select({
        issueId: sales.issueId,
        invoiceNumber: sales.invoiceNumber,
        customerId: sales.customerId,
        customerName: customers.name,
        normalizedName: customers.normalizedName,
        issuedBy: user.name,
        issueDate: sql<Date>`max(${sales.saleDate})`,
        saleId: sql<number>`min(${sales.id})`,
        saleIds: sql<number[]>`array_agg(${sales.id} ORDER BY ${sales.id})`,
        quantity: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
        totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        paidAmount: sql<string>`coalesce(sum(${sales.paidAmount}), 0)`,
        outstanding: sql<string>`coalesce(sum(${sales.outstanding}), 0)`,
        itemCount: sql<number>`count(*)::int`,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(user, eq(sales.createdBy, user.id))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(where)
      .groupBy(
        sales.issueId,
        sales.invoiceNumber,
        sales.customerId,
        customers.name,
        customers.normalizedName,
        user.name,
      )
      .orderBy(desc(sql<number>`max(${sales.id})`))
      .limit(limit)
      .offset(offset);

    // همهٔ قلم‌های هر صدور (یک ردیف = یک قلم) — برای جدول جزئیات و جدا کردن پرزهٔ خارجی
    const issueIds = groups.map((g) => g.issueId);
    const lineRows = issueIds.length
      ? await db
          .select({
            issueId: sales.issueId,
            saleId: sales.id,
            partId: sales.partId,
            partName: parts.name,
            partNumber: parts.partNumber,
            itemName: sales.itemName,
            supplierName: sales.supplierName,
            quantity: sales.quantity,
            totalAmount: sales.totalAmount,
            unitCost: sales.unitCost,
            itemCost: sales.itemCost,
          })
          .from(sales)
          .leftJoin(parts, eq(sales.partId, parts.id))
          .where(inArray(sales.issueId, issueIds))
          .orderBy(sales.id)
      : [];

    const linesByIssue = new Map<string, typeof lineRows>();
    for (const row of lineRows) {
      const list = linesByIssue.get(row.issueId);
      if (list) list.push(row);
      else linesByIssue.set(row.issueId, [row]);
    }

    // تعداد کل صدورها (صفحه‌بندی روی گروه‌هاست، نه ردیف‌ها)
    const countRows = await db
      .select({ count: sql<number>`count(distinct ${sales.issueId})::int` })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(user, eq(sales.createdBy, user.id))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(where);
    const total = Number(countRows[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const formattedRecords = groups.map((record) => {
      const outstanding = Number(record.outstanding || 0);
      const lines = linesByIssue.get(record.issueId) ?? [];
      const items = lines.map((l) => {
        const qty = Number(l.quantity || 0);
        const total = Number(l.totalAmount || 0);
        const isExternal = l.partId == null;
        const costRaw = isExternal ? l.itemCost : l.unitCost;
        return {
          id: l.saleId,
          name: l.partName || l.itemName || "نامشخص",
          partNumber: isExternal ? "" : l.partNumber || "",
          isExternal,
          supplierName: l.supplierName || null,
          quantity: qty,
          unitPrice: qty > 0 ? total / qty : total,
          total,
          cost: costRaw != null ? Number(costRaw) : null,
        };
      });
      const partNames = items.map((i) => i.name);
      const partName = partNames.join("، ") || "نامشخص";
      const partNumber = items
        .map((i) => i.partNumber)
        .filter(Boolean)
        .join("، ");
      return {
        id: record.saleId,
        issueId: record.issueId,
        invoiceNumber: invoiceNumberFor(
          record.invoiceNumber,
          record.customerId,
        ),
        saleIds: record.saleIds ?? [],
        customerName: record.customerName || "نامشخص",
        normalizedName: record.normalizedName || "",
        totalAmount: String(record.totalAmount ?? "0"),
        paidAmount: String(record.paidAmount ?? "0"),
        outstanding: String(record.outstanding ?? "0"),
        isFullyPaid: outstanding <= 0,
        issueDate: record.issueDate
          ? new Date(record.issueDate).toISOString()
          : new Date().toISOString(),
        quantity: Number(record.quantity || 0),
        issuedBy: record.issuedBy || "نامشخص",
        partNumber,
        partName,
        partNames,
        items,
        itemCount: Number(record.itemCount || 1),
        status: outstanding <= 0 ? ("completed" as const) : ("pending" as const),
      };
    });

    return ok(formattedRecords, {
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("Error in parts/records API:", err);
    return serverError(err);
  }
}
