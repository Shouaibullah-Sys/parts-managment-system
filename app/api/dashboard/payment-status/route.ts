// app/api/dashboard/payment-status/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sales } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const paymentData = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN is_fully_paid = true THEN 1 END) as fully_paid,
        COUNT(CASE WHEN is_fully_paid = false AND outstanding < total_amount AND outstanding > 0 THEN 1 END) as partially_paid,
        COUNT(CASE WHEN is_fully_paid = false AND outstanding = total_amount THEN 1 END) as not_paid
      FROM sales
    `);

    const rows = paymentData.rows as any[];
    const status = {
      fullyPaid: parseInt(rows[0]?.fully_paid || "0"),
      partiallyPaid: parseInt(rows[0]?.partially_paid || "0"),
      notPaid: parseInt(rows[0]?.not_paid || "0"),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    );
  }
}
