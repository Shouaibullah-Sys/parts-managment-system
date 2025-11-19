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

    // Build the query with proper date filtering
    let query = sql`
      SELECT 
        DATE(s.sale_date) as date,
        COALESCE(SUM(s.total_amount), 0) as sales,
        COALESCE(SUM(p.amount), 0) as payments
      FROM sales s
      LEFT JOIN payments p ON p.sale_id = s.id AND DATE(p.payment_date) = DATE(s.sale_date)
    `;

    // Add WHERE clause based on date parameters
    if (from && to) {
      query = query.append(
        sql` WHERE s.sale_date >= ${from} AND s.sale_date <= ${to}`
      );
    } else if (from) {
      query = query.append(sql` WHERE s.sale_date >= ${from}`);
    } else if (to) {
      query = query.append(sql` WHERE s.sale_date <= ${to}`);
    } else {
      // Default to last 7 days if no date range provided
      query = query.append(
        sql` WHERE s.sale_date >= CURRENT_DATE - INTERVAL '7 days'`
      );
    }

    // Complete the query
    query = query.append(sql`
      GROUP BY DATE(s.sale_date)
      ORDER BY date ASC
    `);

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
