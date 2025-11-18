// app/api/dashboard/sales-trend/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sales, payments } from "@/db/schema";
import { sql } from "drizzle-orm";
import { subDays, format } from "date-fns";

export async function GET() {
  try {
    // Get sales and payments for the last 7 days
    const trendData = await db.execute(sql`
      SELECT 
        DATE(s.sale_date) as date,
        COALESCE(SUM(s.total_amount), 0) as sales,
        COALESCE(SUM(p.amount), 0) as payments
      FROM sales s
      LEFT JOIN payments p ON p.sale_id = s.id AND DATE(p.payment_date) = DATE(s.sale_date)
      WHERE s.sale_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(s.sale_date)
      ORDER BY date DESC
      LIMIT 7
    `);

    // Format the data
    const formattedData = (trendData.rows as any[])
      .map((row) => ({
        date: row.date,
        sales: parseFloat(row.sales) || 0,
        payments: parseFloat(row.payments) || 0,
      }))
      .reverse(); // Reverse to show oldest first

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales trend" },
      { status: 500 }
    );
  }
}
