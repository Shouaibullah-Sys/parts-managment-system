// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { createSale } from "@/lib/services/sale";
import { createSaleSchema } from "@/lib/validation/schemas";
import { db } from "@/db/drizzle";
import { sales, customers, parts, payments, user } from "@/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
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

    // Fetch sales data with the filters
    const salesData = await fetchSalesData({
      page,
      limit,
      search,
      fromDate,
      toDate,
      period,
    });

    return NextResponse.json({
      success: true,
      data: salesData.data,
      pagination: salesData.pagination,
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
}) {
  const { page, limit, search, fromDate, toDate, period } = params;

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
  const whereConditions = [];

  if (Object.keys(dateFilter).length > 0) {
    whereConditions.push(dateFilter as any);
  }

  if (dateConditions.length > 0) {
    whereConditions.push(and(...dateConditions));
  }

  // Search filter - search in customer name, part name, or part number
  if (search) {
    const searchCondition = sql`
        (${customers.name} ILIKE ${`%${search}%`} OR 
        ${parts.name} ILIKE ${`%${search}%`} OR 
        ${parts.partNumber} ILIKE ${`%${search}%`})
      `;
    whereConditions.push(searchCondition);
  }

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
      issueDate: sales.saleDate,
      quantity: sales.quantity,
      issuedBy: user.name, // Get user name instead of ID
      partNumber: parts.partNumber,
      partName: parts.name,
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
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .groupBy(
      sales.id,
      customers.name,
      customers.normalizedName,
      sales.totalAmount,
      sales.paidAmount,
      sales.outstanding,
      sales.isFullyPaid,
      sales.saleDate,
      sales.quantity,
      user.name, // Group by user name instead of ID
      parts.partNumber,
      parts.name
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
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .groupBy(sales.id);

  // Execute both queries
  const [salesData, totalCountResult] = await Promise.all([
    baseQuery,
    totalCountQuery,
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
  };
}
