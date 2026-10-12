// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { createSale } from "@/lib/services/sale";
import { createSaleSchema } from "@/lib/validation/schemas";
import { db } from "@/db/drizzle";
import { sales, customers, parts, payments, user } from "@/db/schema";
import { eq, and, gte, lte, sql, count, isNull, isNotNull } from "drizzle-orm";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
} from "date-fns";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );

    const sale = await createSale(parsed.data);
    return NextResponse.json(sale);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for fetching sales with filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const period = searchParams.get("period") || "today";
    const section = searchParams.get("section") || "";
    const normalizedName = searchParams.get("normalizedName") || "";
    const paymentStatus = searchParams.get("paymentStatus") || ""; // "paid" | "outstanding" | ""
    const excludeReturned = searchParams.get("excludeReturned") === "true";
    const returnedOnly = searchParams.get("returnedOnly") === "true";

    // Fetch sales data with the filters
    const salesData = await fetchSalesData({
      page,
      limit,
      search,
      fromDate,
      toDate,
      period,
      section,
      normalizedName,
      paymentStatus,
      excludeReturned,
      returnedOnly,
    });

    return NextResponse.json({
      success: true,
      data: salesData.data,
      pagination: salesData.pagination,
      summary: salesData.summary,
    });
  } catch (err: any) {
    console.error("Error fetching sales data:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// Actual data fetching implementation
async function fetchSalesData(params: {
  page: number;
  limit: number;
  search: string;
  fromDate: string;
  toDate: string;
  period: string;
  section?: string;
  normalizedName?: string;
  paymentStatus?: string;
  excludeReturned?: boolean;
  returnedOnly?: boolean;
}) {
  const {
    page,
    limit,
    search,
    fromDate,
    toDate,
    period,
    section,
    normalizedName,
    paymentStatus,
    excludeReturned,
    returnedOnly,
  } = params;

  // Calculate date range based on period
  let dateFilter = {};
  const today = new Date();

  switch (period) {
    case "today":
      dateFilter = gte(sales.saleDate, startOfToday());
      break;
    case "week":
      dateFilter = gte(sales.saleDate, startOfWeek(today));
      break;
    case "month":
      dateFilter = gte(sales.saleDate, startOfMonth(today));
      break;
    case "lifetime":
      dateFilter = {};
      break;
  }

  // Apply custom date range if provided
  let dateConditions = [];
  if (fromDate) {
    const fromDateObj = parseISO(fromDate);
    if (isValid(fromDateObj)) {
      dateConditions.push(gte(sales.saleDate, fromDateObj));
    }
  }
  if (toDate) {
    const toDateObj = parseISO(toDate);
    if (isValid(toDateObj)) {
      // Add one day to include the end date fully
      const endOfDay = new Date(toDateObj);
      endOfDay.setHours(23, 59, 59, 999);
      dateConditions.push(lte(sales.saleDate, endOfDay));
    }
  }

  // Build query conditions
  const baseConditions = [];

  if (Object.keys(dateFilter).length > 0) {
    baseConditions.push(dateFilter as any);
  }

  if (dateConditions.length > 0) {
    baseConditions.push(and(...dateConditions));
  }

  // Search filter - search in customer name, part name, or part number
  if (search) {
    const searchCondition = sql`
        (${customers.name} ILIKE ${`%${search}%`} OR 
        ${parts.name} ILIKE ${`%${search}%`} OR 
        ${parts.partNumber} ILIKE ${`%${search}%`})
      `;
    baseConditions.push(searchCondition);
  }

  // Section filter - filter sales by part section
  if (section) {
    baseConditions.push(eq(parts.section, section));
  }

  // Exact customer filter (normalized name — matches the customer summary grouping)
  if (normalizedName) {
    baseConditions.push(eq(customers.normalizedName, normalizedName));
  }

  // فروش‌های مرتجع (مرجوعی): حذف از لیست/گزارش یا نمایش فقط مرتجع‌ها
  const whereConditions = [...baseConditions];

  // وضعیت پرداخت: پرداخت‌شده / باقیمانده (فیلتر گزارش‌ها و کارت‌ها)
  if (paymentStatus === "paid") {
    whereConditions.push(eq(sales.isFullyPaid, true));
  } else if (paymentStatus === "outstanding") {
    whereConditions.push(sql`${sales.outstanding} > 0`);
  }

  if (excludeReturned) {
    whereConditions.push(isNull(sales.returnedAt));
  }
  if (returnedOnly) {
    whereConditions.push(isNotNull(sales.returnedAt));
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build the main query with joins
  const baseQuery = db
    .select({
      id: sales.id,
      customerName: customers.name,
      normalizedName: customers.normalizedName,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
      outstanding: sales.outstanding,
      isFullyPaid: sales.isFullyPaid,
      discount: sales.discount,
      returnedAt: sales.returnedAt,
      returnNote: sales.returnNote,
      issueDate: sales.saleDate,
      quantity: sales.quantity,
      issuedBy: user.name, // Get user name instead of ID
      partNumber: parts.partNumber,
      partName: parts.name,
      section: parts.section,
      // Calculate actual paid amount from payments table
      actualPaidAmount: sql<string>`COALESCE(
          (SELECT SUM(${payments.amount})
          FROM ${payments}
          WHERE ${payments.saleId} = ${sales.id}),
          ${sales.paidAmount}
        )`,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(parts, eq(sales.partId, parts.id))
    .leftJoin(payments, eq(payments.saleId, sales.id))
    .leftJoin(user, eq(sales.createdBy, user.id)) // Join with user table
    .where(whereClause)
    .groupBy(
      sales.id,
      customers.name,
      customers.normalizedName,
      sales.totalAmount,
      sales.paidAmount,
      sales.outstanding,
      sales.isFullyPaid,
      sales.returnedAt,
      sales.returnNote,
      sales.saleDate,
      sales.quantity,
      user.name, // Group by user name instead of ID
      parts.partNumber,
      parts.name,
      parts.section
    )
    .limit(limit)
    .offset(offset)
    .orderBy(sql`${sales.saleDate} DESC`);

  // Get total count for pagination
  const totalCountQuery = db
    .select({ count: count() })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(parts, eq(sales.partId, parts.id))
    .leftJoin(payments, eq(payments.saleId, sales.id))
    .leftJoin(user, eq(sales.createdBy, user.id)) // Include user join for consistency
    .where(whereClause)
    .groupBy(sales.id);

  // Summary aggregates under the same filters (ignores pagination)
  // فروش‌های مرتجع هرگز جمع‌های گزارش/کارت‌ها را شامل نمی‌شوند
  const summaryQuery = db
    .select({
      totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${sales.paidAmount}), 0)`,
      totalOutstanding: sql<string>`COALESCE(SUM(${sales.outstanding}), 0)`,
      count: count(),
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(parts, eq(sales.partId, parts.id))
    .where(and(...whereConditions, isNull(sales.returnedAt)));

  // مجموع بازپرداخت/مرجوعی: پرداخت‌های منفی (refunds) در همان بازه فیلتر
  // (بدون اعمال فیلتر excludeReturned — چون بازپرداخت فقط برای فروش مرتجع رخ می‌دهد)
  const refundsQuery = db
    .select({
      totalRefunds: sql<string>`COALESCE(-SUM(${payments.amount}), 0)`,
      refundCount: count(),
    })
    .from(payments)
    .innerJoin(sales, eq(payments.saleId, sales.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(parts, eq(sales.partId, parts.id))
    .where(
      and(
        ...baseConditions,
        sql`${payments.amount} < 0`,
        isNotNull(sales.returnedAt)
      )
    );

  // Execute all queries
  const [salesData, totalCountResult, summaryResult, refundsResult] =
    await Promise.all([
      baseQuery,
      totalCountQuery,
      summaryQuery,
      refundsQuery,
    ]);

  const total = totalCountResult.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data: salesData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    summary: {
      totalSales: Number(summaryResult[0]?.totalSales || 0),
      totalPaid: Number(summaryResult[0]?.totalPaid || 0),
      totalOutstanding: Number(summaryResult[0]?.totalOutstanding || 0),
      count: summaryResult[0]?.count || 0,
      totalRefunds: Number(refundsResult[0]?.totalRefunds || 0),
      refundCount: refundsResult[0]?.refundCount || 0,
    },
  };
}
