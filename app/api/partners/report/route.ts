// app/api/partners/report/route.ts
// گزارش فروش و سود شرکا — فقط ادمین
// سهم شریک = سود ناخالص × درصد شریک؛ باقی‌مانده سهم مغازه
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sales, parts, partners, customers, user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { and, desc, eq, gte, lte, sql, isNull } from "drizzle-orm";
import { parseISO, isValid } from "date-fns";

async function getCurrentUser(request: NextRequest) {
  const sessionData = await getSessionFromRequest(request);
  if (!sessionData?.user) return null;

  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionData.user.id))
    .limit(1);

  return currentUser ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "فقط ادمین به گزارش سود دسترسی دارد" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const partnerId = searchParams.get("partnerId") || "";
    const section = searchParams.get("section") || "";
    const includeReturned = searchParams.get("includeReturned") === "true";

    // شرط بازهٔ تاریخ (پایان روز شامل شود)
    const dateConditions = [];
    if (from) {
      const fromObj = parseISO(from);
      if (isValid(fromObj)) dateConditions.push(gte(sales.saleDate, fromObj));
    }
    if (to) {
      const toObj = parseISO(to);
      if (isValid(toObj)) {
        const endOfDay = new Date(toObj);
        endOfDay.setHours(23, 59, 59, 999);
        dateConditions.push(lte(sales.saleDate, endOfDay));
      }
    }

    const baseConditions = [];
    if (dateConditions.length) baseConditions.push(and(...dateConditions));
    if (!includeReturned) baseConditions.push(isNull(sales.returnedAt));
    if (partnerId) {
      const pid = parseInt(partnerId);
      if (!Number.isNaN(pid)) baseConditions.push(eq(sales.partnerId, pid));
    }
    if (section) baseConditions.push(eq(parts.section, section));

    const whereClause = baseConditions.length
      ? and(...baseConditions)
      : undefined;

    // ۱) خلاصه به تفکیک شریک (شامل «بدون شراکت»)
    const summaryRows = await db
      .select({
        partnerId: sales.partnerId,
        partnerName: partners.name,
        percentage: partners.percentage,
        salesCount: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${sales.quantity}), 0)::int`,
        revenue: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        cogs: sql<string>`coalesce(sum(coalesce(${sales.unitCost}, 0) * ${sales.quantity}), 0)`,
        paid: sql<string>`coalesce(sum(${sales.paidAmount}), 0)`,
        outstanding: sql<string>`coalesce(sum(${sales.outstanding}), 0)`,
        returnedCount: sql<number>`count(*) filter (where ${sales.returnedAt} is not null)::int`,
      })
      .from(sales)
      .leftJoin(parts, eq(sales.partId, parts.id))
      .leftJoin(partners, eq(sales.partnerId, partners.id))
      .where(whereClause)
      .groupBy(sales.partnerId, partners.name, partners.percentage)
      .orderBy(desc(sql`sum(${sales.totalAmount})`));

    // ۲) شرکای بدون فروش در بازه (ردیف صفر نمایش داده شود)
    const partnersWithSales = new Set(
      summaryRows.map((r) => r.partnerId).filter((v): v is number => v != null),
    );
    const selectedPid = partnerId ? parseInt(partnerId) : NaN;
    const zeroPartners = await db
      .select({
        id: partners.id,
        name: partners.name,
        percentage: partners.percentage,
      })
      .from(partners)
      .where(
        partnerId && !Number.isNaN(selectedPid)
          ? eq(partners.id, selectedPid) // فیلتر مشخص: همان شریک حتی بدون فروش
          : eq(partners.active, true),
      );

    // ۳) روند (ماهانه؛ بازهٔ کوتاه روزانه)
    const dayCount =
      from && to
        ? Math.round(
            (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
          )
        : 365;
    const bucketExpr =
      dayCount <= 45
        ? sql<string>`to_char(date_trunc('day', ${sales.saleDate}), 'YYYY-MM-DD')`
        : sql<string>`to_char(date_trunc('month', ${sales.saleDate}), 'YYYY-MM')`;

    const trendRows = await db
      .select({
        bucket: bucketExpr,
        partnerId: sales.partnerId,
        partnerName: partners.name,
        revenue: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        cogs: sql<string>`coalesce(sum(coalesce(${sales.unitCost}, 0) * ${sales.quantity}), 0)`,
        salesCount: sql<number>`count(*)::int`,
      })
      .from(sales)
      .leftJoin(parts, eq(sales.partId, parts.id))
      .leftJoin(partners, eq(sales.partnerId, partners.id))
      .where(whereClause)
      .groupBy(sql`1`, sales.partnerId, partners.name)
      .orderBy(sql`1`);

    // ۴) قطعات هر شریک (drill-down؛ ۱۰ قطعهٔ پرسود)
    const partRows = await db
      .select({
        partnerId: sales.partnerId,
        partId: sales.partId,
        partName: sql<string>`coalesce(${parts.name}, ${sales.itemName}, 'نامعلوم')`,
        partNumber: sql<string>`coalesce(${parts.partNumber}, '-')`,
        quantity: sql<number>`coalesce(sum(${sales.quantity}), 0)::int`,
        revenue: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        cogs: sql<string>`coalesce(sum(coalesce(${sales.unitCost}, 0) * ${sales.quantity}), 0)`,
      })
      .from(sales)
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(whereClause)
      .groupBy(sales.partnerId, sales.partId, parts.name, parts.partNumber, sales.itemName)
      .orderBy(desc(sql`sum(${sales.totalAmount})`));

    // ۵) مشتریان هر شریک (drill-down؛ ۵ مشتریٔ برتر)
    const customerRows = await db
      .select({
        partnerId: sales.partnerId,
        customerId: sales.customerId,
        customerName: customers.name,
        salesCount: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        outstanding: sql<string>`coalesce(sum(${sales.outstanding}), 0)`,
      })
      .from(sales)
      .leftJoin(parts, eq(sales.partId, parts.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(whereClause)
      .groupBy(sales.partnerId, sales.customerId, customers.name)
      .orderBy(desc(sql`sum(${sales.totalAmount})`));

    // محاسبهٔ سهم‌ها
    const compute = (row: {
      percentage: string | null;
      revenue: string;
      cogs: string;
      paid: string;
      outstanding: string;
      salesCount: number;
      units: number;
      returnedCount: number;
    }) => {
      const revenue = Number(row.revenue);
      const cogs = Number(row.cogs);
      const gross = revenue - cogs;
      const pct = Number(row.percentage ?? 0);
      const partnerShare = (gross * pct) / 100;
      return {
        salesCount: row.salesCount,
        units: row.units,
        revenue,
        cogs,
        grossProfit: gross,
        percentage: pct,
        partnerShare,
        shopShare: gross - partnerShare,
        paid: Number(row.paid),
        outstanding: Number(row.outstanding),
        returnedCount: row.returnedCount,
      };
    };

    const summary = summaryRows.map((r) => ({
      id: r.partnerId,
      name: r.partnerName ?? "بدون شراکت",
      ...compute(r),
    }));

    // شرکای فعال بدون فروش
    for (const p of zeroPartners) {
      if (partnersWithSales.has(p.id)) continue;
      summary.push({
        id: p.id,
        name: p.name,
        ...compute({
          percentage: p.percentage,
          revenue: "0",
          cogs: "0",
          paid: "0",
          outstanding: "0",
          salesCount: 0,
          units: 0,
          returnedCount: 0,
        }),
      });
    }

    const totals = summary.reduce(
      (acc, s) => ({
        salesCount: acc.salesCount + s.salesCount,
        units: acc.units + s.units,
        revenue: acc.revenue + s.revenue,
        cogs: acc.cogs + s.cogs,
        grossProfit: acc.grossProfit + s.grossProfit,
        partnerShare: acc.partnerShare + s.partnerShare,
        shopShare: acc.shopShare + s.shopShare,
        paid: acc.paid + s.paid,
        outstanding: acc.outstanding + s.outstanding,
        returnedCount: acc.returnedCount + s.returnedCount,
      }),
      {
        salesCount: 0,
        units: 0,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        partnerShare: 0,
        shopShare: 0,
        paid: 0,
        outstanding: 0,
        returnedCount: 0,
      },
    );

    const partsByPartner: Record<string, typeof partRows> = {};
    for (const row of partRows) {
      const key = String(row.partnerId ?? "unassigned");
      if (!partsByPartner[key]) partsByPartner[key] = [];
      if (partsByPartner[key].length < 10) partsByPartner[key].push(row);
    }

    const customersByPartner: Record<string, typeof customerRows> = {};
    for (const row of customerRows) {
      const key = String(row.partnerId ?? "unassigned");
      if (!customersByPartner[key]) customersByPartner[key] = [];
      if (customersByPartner[key].length < 5) customersByPartner[key].push(row);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        totals,
        trend: trendRows,
        partsByPartner,
        customersByPartner,
        granularity: dayCount <= 45 ? "day" : "month",
      },
    });
  } catch (err) {
    console.error("Error building partner report:", err);
    return NextResponse.json(
      { success: false, error: "خطا در محاسبهٔ گزارش شرکا" },
      { status: 500 },
    );
  }
}
