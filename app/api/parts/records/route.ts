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
    const where =
      searchConditions.length > 0 ? and(...searchConditions) : undefined;

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

    // نام همهٔ قلم‌های هر صدور (برای نمایش در ردیف/جزئیات و جستجوی سمت کلاینت)
    const issueIds = groups.map((g) => g.issueId);
    const nameRows = issueIds.length
      ? await db
          .select({
            issueId: sales.issueId,
            partName: sql<string | null>`string_agg(
              coalesce(${parts.name}, ${sales.itemName}, 'نامشخص'),
              '، ' ORDER BY ${sales.id})`,
            partNumber: sql<string | null>`string_agg(${parts.partNumber}, '، ' ORDER BY ${sales.id})`,
          })
          .from(sales)
          .leftJoin(parts, eq(sales.partId, parts.id))
          .where(inArray(sales.issueId, issueIds))
          .groupBy(sales.issueId)
      : [];
    const namesByIssue = new Map(nameRows.map((r) => [r.issueId, r]));

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
      const names = namesByIssue.get(record.issueId);
      const partName = names?.partName || "نامشخص";
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
        partNumber: names?.partNumber || "",
        partName,
        partNames: partName.split("، "),
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
