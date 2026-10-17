// lib/customer-summary.ts
// ساخت دادهٔ گزارش «خلاصه مشتریان» با تفکیک شرکا — فقط سرور
// سود ناخالص = فروش ناخالص − بهای تمام‌شده (unitCost)؛ سهم شریک = سود × درصد شریک
import { db } from "@/db/drizzle";
import { sales, customers, parts, partners } from "@/db/schema";
import { and, eq, gte, lte, sql, isNull, type SQL } from "drizzle-orm";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
} from "date-fns";
import type {
  CustomerSummaryData,
  CustomerSummaryRow,
  CustomerPartnerRow,
  CustomerSummaryPartnerRollup,
} from "@/components/sales/customer-summary-types";

export interface CustomerSummaryParams {
  period?: string;
  fromDate?: string;
  toDate?: string;
  paymentStatus?: string;
  search?: string;
  /** فیلتر دقیق یک مشتری (اختیاری) */
  normalizedName?: string;
  /** فیلتر دقیق با شناسهٔ مشتری (برای موارد بدون نام نرمال‌شده) */
  customerId?: number;
}

export async function buildCustomerSummary(
  params: CustomerSummaryParams,
): Promise<CustomerSummaryData> {
  const period = params.period || "lifetime";
  const fromDate = params.fromDate || "";
  const toDate = params.toDate || "";
  const paymentStatus = params.paymentStatus || "";
  const search = params.search || "";
  const normalizedNameFilter = params.normalizedName || "";

  // بازهٔ تاریخ بر اساس دوره (هماهنگ با /api/sales)
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

  if (params.customerId != null) {
    conditions.push(eq(sales.customerId, params.customerId));
  } else if (normalizedNameFilter) {
    conditions.push(eq(customers.normalizedName, normalizedNameFilter));
  }

  if (paymentStatus === "paid") {
    conditions.push(eq(sales.isFullyPaid, true));
  } else if (paymentStatus === "outstanding") {
    conditions.push(sql`${sales.outstanding} > 0`);
  }

  // مرجوعی‌ها همیشه از خلاصه مشتریان حذف می‌شوند (مثل نمای فعلی)
  conditions.push(isNull(sales.returnedAt));
  // پیش‌نویس‌ها در خلاصه مشتریان حساب نمی‌شوند
  conditions.push(eq(sales.status, "final"));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const externalPayable = sql`case when ${sales.partId} is null then coalesce(${sales.itemCost}, ${sales.unitCost}, 0) * ${sales.quantity} else 0 end`;

  const rows = await db
    .select({
      customerId: sales.customerId,
      customerName: customers.name,
      normalizedName: customers.normalizedName,
      partnerId: sales.partnerId,
      partnerName: partners.name,
      percentage: partners.percentage,
      salesCount: sql<number>`count(*)::int`,
      quantity: sql<number>`coalesce(sum(${sales.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)::float8`,
      cogs: sql<number>`coalesce(sum(coalesce(${sales.unitCost}, 0) * ${sales.quantity}), 0)::float8`,
      externalPayable: sql<number>`coalesce(sum(${externalPayable}), 0)::float8`,
      discount: sql<number>`coalesce(sum(${sales.discount}), 0)::float8`,
      paid: sql<number>`coalesce(sum(${sales.paidAmount}), 0)::float8`,
      outstanding: sql<number>`coalesce(sum(${sales.outstanding}), 0)::float8`,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(partners, eq(sales.partnerId, partners.id))
    .leftJoin(parts, eq(sales.partId, parts.id))
    .where(whereClause)
    .groupBy(
      sales.customerId,
      customers.name,
      customers.normalizedName,
      sales.partnerId,
      partners.name,
      partners.percentage,
    );

  /* ---------------- rollups ---------------- */
  const customerKey = (r: { normalizedName: string | null; customerId: number | null }) =>
    r.normalizedName ?? `id:${r.customerId ?? "none"}`;
  const partnerKey = (id: number | null) => String(id ?? "unassigned");

  interface CustAcc {
    customerId: number | null;
    customerName: string;
    normalizedName: string | null;
    salesCount: number;
    quantity: number;
    revenue: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    discount: number;
    paid: number;
    outstanding: number;
    partners: Set<string>;
  }
  interface PartAcc extends Omit<CustomerSummaryPartnerRollup, "customersCount"> {
    customerKeys: Set<string>;
  }

  const byCustomer = new Map<string, CustAcc>();
  const byPartner = new Map<string, PartAcc>();
  const customerPartners: CustomerPartnerRow[] = [];

  for (const r of rows) {
    const pct = Number(r.percentage ?? 0);
    const revenue = Number(r.revenue);
    const cogs = Number(r.cogs);
    const external = Number(r.externalPayable);
    const gross = revenue - cogs;
    const partnerShare = (gross * pct) / 100;
    const shopShare = gross - partnerShare;
    const paid = Number(r.paid);
    const outstanding = Number(r.outstanding);

    const partnerName = r.partnerName ?? "بدون شراکت";
    const ckey = customerKey(r);

    customerPartners.push({
      customerId: r.customerId,
      customerName: r.customerName ?? "نامشخص",
      normalizedName: r.normalizedName,
      partnerId: r.partnerId,
      partnerName,
      percentage: pct,
      salesCount: r.salesCount,
      quantity: r.quantity,
      revenue,
      cogs,
      grossProfit: gross,
      partnerShare,
      shopShare,
      paid,
      outstanding,
    });

    let c = byCustomer.get(ckey);
    if (!c) {
      c = {
        customerId: r.customerId,
        customerName: r.customerName ?? "نامشخص",
        normalizedName: r.normalizedName,
        salesCount: 0,
        quantity: 0,
        revenue: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
        discount: 0,
        paid: 0,
        outstanding: 0,
        partners: new Set<string>(),
      };
      byCustomer.set(ckey, c);
    }
    c.salesCount += r.salesCount;
    c.quantity += r.quantity;
    c.revenue += revenue;
    c.netSales += revenue - external;
    c.cogs += cogs;
    c.grossProfit += gross;
    c.discount += Number(r.discount);
    c.paid += paid;
    c.outstanding += outstanding;
    c.partners.add(partnerName);

    const pkey = partnerKey(r.partnerId);
    let p = byPartner.get(pkey);
    if (!p) {
      p = {
        partnerId: r.partnerId,
        partnerName,
        percentage: pct,
        salesCount: 0,
        quantity: 0,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        partnerShare: 0,
        shopShare: 0,
        paid: 0,
        outstanding: 0,
        customerKeys: new Set<string>(),
      };
      byPartner.set(pkey, p);
    }
    p.salesCount += r.salesCount;
    p.quantity += r.quantity;
    p.revenue += revenue;
    p.cogs += cogs;
    p.grossProfit += gross;
    p.partnerShare += partnerShare;
    p.shopShare += shopShare;
    p.paid += paid;
    p.outstanding += outstanding;
    p.customerKeys.add(ckey);
  }

  const customersArr: CustomerSummaryRow[] = Array.from(byCustomer.values())
    .map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      normalizedName: c.normalizedName,
      salesCount: c.salesCount,
      quantity: c.quantity,
      revenue: c.revenue,
      netSales: c.netSales,
      cogs: c.cogs,
      grossProfit: c.grossProfit,
      discount: c.discount,
      paid: c.paid,
      outstanding: c.outstanding,
      partners: Array.from(c.partners),
      isFullyPaid: c.outstanding <= 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const partnersArr: CustomerSummaryPartnerRollup[] = Array.from(
    byPartner.values(),
  )
    .map(({ customerKeys, ...p }) => ({ ...p, customersCount: customerKeys.size }))
    .sort((a, b) => b.revenue - a.revenue);

  const totals = customersArr.reduce(
    (acc, c) => ({
      salesCount: acc.salesCount + c.salesCount,
      quantity: acc.quantity + c.quantity,
      revenue: acc.revenue + c.revenue,
      netSales: acc.netSales + c.netSales,
      cogs: acc.cogs + c.cogs,
      grossProfit: acc.grossProfit + c.grossProfit,
      discount: acc.discount + c.discount,
      paid: acc.paid + c.paid,
      outstanding: acc.outstanding + c.outstanding,
    }),
    {
      salesCount: 0,
      quantity: 0,
      revenue: 0,
      netSales: 0,
      cogs: 0,
      grossProfit: 0,
      discount: 0,
      paid: 0,
      outstanding: 0,
    },
  );

  const partnerShareTotal = partnersArr.reduce(
    (s, p) => s + p.partnerShare,
    0,
  );
  const shopShareTotal = partnersArr.reduce((s, p) => s + p.shopShare, 0);

  return {
    customers: customersArr,
    customerPartners,
    partners: partnersArr,
    totals: {
      ...totals,
      customersCount: customersArr.length,
      partnersCount: partnersArr.length,
      partnerShare: partnerShareTotal,
      shopShare: shopShareTotal,
    },
    filters: { period, from: fromDate, to: toDate, paymentStatus, search },
  };
}
