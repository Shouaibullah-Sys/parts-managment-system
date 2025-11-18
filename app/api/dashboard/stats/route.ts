// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sales, customers, parts } from "@/db/schema";
import { sql } from "drizzle-orm";
import { startOfToday, startOfMonth } from "date-fns";

export async function GET() {
  try {
    const today = startOfToday();
    const monthStart = startOfMonth(new Date());

    // Get total sales, paid, outstanding
    const salesData = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(${sales.paidAmount}), 0)`,
        totalOutstanding: sql<number>`COALESCE(SUM(${sales.outstanding}), 0)`,
        todaySales: sql<number>`
          COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${today} THEN ${sales.totalAmount} ELSE 0 END), 0)
        `,
        monthlySales: sql<number>`
          COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart} THEN ${sales.totalAmount} ELSE 0 END), 0)
        `,
      })
      .from(sales);

    // Get total customers
    const customersData = await db
      .select({ totalCustomers: sql<number>`COUNT(*)` })
      .from(customers);

    // Get total parts
    const partsData = await db
      .select({ totalParts: sql<number>`COUNT(*)` })
      .from(parts);

    // Get low stock count using transaction-based calculation
    const lowStockData = await db.execute(sql`
      SELECT COUNT(*) as low_stock_count
      FROM parts p
      WHERE COALESCE((
        SELECT SUM(i.change)
        FROM inventory_transactions i
        WHERE i.part_id = p.id
      ), 0) < p.min_stock
    `);

    const stats = {
      totalSales: parseFloat(salesData[0]?.totalSales?.toString() || "0"),
      totalPaid: parseFloat(salesData[0]?.totalPaid?.toString() || "0"),
      totalOutstanding: parseFloat(
        salesData[0]?.totalOutstanding?.toString() || "0"
      ),
      todaySales: parseFloat(salesData[0]?.todaySales?.toString() || "0"),
      monthlySales: parseFloat(salesData[0]?.monthlySales?.toString() || "0"),
      totalCustomers: parseInt(
        customersData[0]?.totalCustomers?.toString() || "0"
      ),
      totalParts: parseInt(partsData[0]?.totalParts?.toString() || "0"),
      lowStockCount: parseInt(
        (lowStockData.rows[0] as any)?.low_stock_count || "0"
      ),
      paymentCompletionRate: salesData[0]?.totalSales
        ? (parseFloat(salesData[0].totalPaid.toString()) /
            parseFloat(salesData[0].totalSales.toString())) *
          100
        : 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
