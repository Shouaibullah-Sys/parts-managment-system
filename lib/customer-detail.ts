// lib/customer-detail.ts
// راپور انفرادی یک مشتری — فقط سرور
// شامل: خلاصهٔ مشتری، تفکیک شرکا و جزئیات کامل معاملات (هماهنگ با فیلترهای فعال)
import { db } from "@/db/drizzle";
import { sales, customers, parts, partners, user } from "@/db/schema";
import { and, eq, gte, lte, sql, isNull, type SQL } from "drizzle-orm";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
} from "date-fns";
import { buildCustomerSummary } from "./customer-summary";
import type {
  CustomerDetailData,
  CustomerDetailRow,
} from "@/components/sales/customer-summary-types";

export interface CustomerDetailParams {
  normalizedName?: string;
  customerId?: number;
  period?: string;
  fromDate?: string;
  toDate?: string;
  paymentStatus?: string;
  search?: string;
}

export async function buildCustomerDetail(
  params: CustomerDetailParams,
): Promise<CustomerDetailData> {
  const normalizedName = params.normalizedName || "";
  const customerId = params.customerId;
  const period = params.period || "lifetime";
  const fromDate = params.fromDate || "";
  const toDate = params.toDate || "";
  const paymentStatus = params.paymentStatus || "";
  const search = params.search || "";

  // خلاصهٔ مشتری + تفکیک شرکا از همان لایهٔ گزارش خلاصهٔ مشتریان
  const summary = await buildCustomerSummary({
    period,
    fromDate,
    toDate,
    paymentStatus,
    search,
    normalizedName,
    customerId,
  });

  const customer = summary.customers[0] ?? null;
  const partnerRows = summary.customerPartners;

  /* -------------------- شرایط جزئیات معاملات -------------------- */
  const today = new Date();
  const conditions: SQL[] = [];
  switch (period) {
    case "today":
      conditions.push(gte(sales.saleDate, startOfToday()));
      break;
    case "week":
      conditions.push(gte(sales.saleDate, startOfWeek(today)));
      break;
    case "month":
      conditions.push(gte(sales.saleDate, startOfMonth(today)));
      break;
    default:
      break;
  }

  const range: SQL[] = [];
  if (fromDate) {
    const d = parseISO(fromDate);
    if (isValid(d)) range.push(gte(sales.saleDate, d));
  }
  if (toDate) {
    const d = parseISO(toDate);
    if (isValid(d)) {
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      range.push(lte(sales.saleDate, endOfDay));
    }
  }
  if (range.length) {
    const r = and(...range);
    if (r) conditions.push(r);
  }

  if (search) {
    conditions.push(sql`(
      ${customers.name} ILIKE ${`%${search}%`} OR
      ${parts.name} ILIKE ${`%${search}%`} OR
      ${parts.partNumber} ILIKE ${`%${search}%`} OR
      ${sales.itemName} ILIKE ${`%${search}%`}
    )`);
  }

  if (customerId != null) {
    conditions.push(eq(sales.customerId, customerId));
  } else if (normalizedName) {
    conditions.push(eq(customers.normalizedName, normalizedName));
  }

  if (paymentStatus === "paid") {
    conditions.push(eq(sales.isFullyPaid, true));
  } else if (paymentStatus === "outstanding") {
    conditions.push(sql`${sales.outstanding} > 0`);
  }

  // مرجوعی‌ها هرگز در راپور مشتری نمایش داده نمی‌شوند
  conditions.push(isNull(sales.returnedAt));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const raw = await db
    .select({
      id: sales.id,
      issueDate: sales.saleDate,
      partName: sql<string | null>`coalesce(${parts.name}, ${sales.itemName})`,
      partNumber: parts.partNumber,
      partnerName: partners.name,
      quantity: sales.quantity,
      amount: sales.totalAmount,
      discount: sales.discount,
      paid: sales.paidAmount,
      outstanding: sales.outstanding,
      isFullyPaid: sales.isFullyPaid,
      issuedBy: user.name,
      isExternal: sql<boolean>`(${sales.partId} IS NULL)`,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(parts, eq(sales.partId, parts.id))
    .leftJoin(partners, eq(sales.partnerId, partners.id))
    .leftJoin(user, eq(sales.createdBy, user.id))
    .where(whereClause)
    .orderBy(sql`${sales.saleDate} DESC`);

  const rows: CustomerDetailRow[] = raw.map((r) => ({
    id: r.id,
    issueDate: r.issueDate ? new Date(r.issueDate).toISOString() : "",
    partName: r.partName,
    partNumber: r.partNumber,
    partnerName: r.partnerName,
    quantity: Number(r.quantity) || 0,
    amount: Number(r.amount) || 0,
    discount: Number(r.discount) || 0,
    paid: Number(r.paid) || 0,
    outstanding: Number(r.outstanding) || 0,
    isFullyPaid: Boolean(r.isFullyPaid),
    issuedBy: r.issuedBy,
    isExternal: Boolean(r.isExternal),
  }));

  const totals = rows.reduce(
    (a, r) => ({
      salesCount: a.salesCount + 1,
      quantity: a.quantity + r.quantity,
      amount: a.amount + r.amount,
      discount: a.discount + r.discount,
      paid: a.paid + r.paid,
      outstanding: a.outstanding + r.outstanding,
    }),
    {
      salesCount: 0,
      quantity: 0,
      amount: 0,
      discount: 0,
      paid: 0,
      outstanding: 0,
    },
  );

  return {
    customer,
    partners: partnerRows,
    rows,
    totals,
    filters: {
      period,
      from: fromDate,
      to: toDate,
      paymentStatus,
      search,
    },
  };
}
