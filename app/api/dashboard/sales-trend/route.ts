// app/api/dashboard/sales-trend/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sales, payments } from "@/db/schema";
import { sql } from "drizzle-orm";
import { subDays, format } from "date-fns";

export async function GET(request: Request) {
  try {
    // Only log in non-browser environments
    if (typeof window === "undefined") {
      console.log("=== SALES TREND API CALLED ===");
      console.log("URL:", request.url);
      console.log("Headers:", Object.fromEntries(request.headers.entries()));
    }
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (typeof window === "undefined") {
      console.log("From:", from);
      console.log("To:", to);
    }

    // Aggregate sales and payments SEPARATELY per day, then join.
    // A payment row must never duplicate a sale row — otherwise a same-day
    // second payment would inflate income in this chart.
    let salesFilter = sql`WHERE s.sale_date >= CURRENT_DATE - INTERVAL '7 days' AND s.returned_at IS NULL`;
    let paymentsFilter = sql`WHERE p.payment_date >= CURRENT_DATE - INTERVAL '7 days'`;

    // Add WHERE clause based on date parameters
    // فروش‌های مرتجع از درآمد روزانه خارج‌اند (پرداخت‌ها/بازپرداخت‌ها جریان نقد را می‌سازند)
    if (from && to) {
      salesFilter = sql`WHERE s.sale_date >= ${from} AND s.sale_date <= ${to} AND s.returned_at IS NULL`;
      paymentsFilter = sql`WHERE p.payment_date >= ${from} AND p.payment_date <= ${to}`;
    } else if (from) {
      salesFilter = sql`WHERE s.sale_date >= ${from} AND s.returned_at IS NULL`;
      paymentsFilter = sql`WHERE p.payment_date >= ${from}`;
    } else if (to) {
      salesFilter = sql`WHERE s.sale_date <= ${to} AND s.returned_at IS NULL`;
      paymentsFilter = sql`WHERE p.payment_date <= ${to}`;
    } else {
      salesFilter = sql`WHERE s.returned_at IS NULL`;
    }

    // پیش‌نویس‌ها در روند فروش حساب نمی‌شوند
    salesFilter = salesFilter.append(sql` AND s.status = 'final'`);

    const query = sql`
      SELECT
        COALESCE(sa.day, pa.day) as date,
        COALESCE(sa.sales, 0) as sales,
        COALESCE(pa.payments, 0) as payments
      FROM (
        SELECT DATE(s.sale_date) as day,
               COALESCE(SUM(s.total_amount - CASE WHEN s.part_id IS NULL THEN COALESCE(s.item_cost, s.unit_cost, 0) * s.quantity ELSE 0 END), 0) as sales
        FROM sales s
        ${salesFilter}
        GROUP BY 1
      ) sa
      FULL OUTER JOIN (
        SELECT DATE(p.payment_date) as day,
               COALESCE(SUM(p.amount), 0) as payments
        FROM payments p
        ${paymentsFilter}
        GROUP BY 1
      ) pa ON sa.day = pa.day
      ORDER BY date ASC
    `;

    // Execute the query
    const trendData = await db.execute(query);

    // Format the data
    const formattedData = (trendData.rows as any[]).map((row) => ({
      date: row.date,
      sales: parseFloat(row.sales) || 0,
      payments: parseFloat(row.payments) || 0,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sales trend",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
