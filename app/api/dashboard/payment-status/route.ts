// app/api/dashboard/payment-status/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sales } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // قابل وصول خالص = فاکتور − بهای خرید پرزهٔ خارجی (فقط سود مغازه وصول میشود)
    const paymentData = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN is_fully_paid = true THEN 1 END) as fully_paid,
        COUNT(CASE WHEN is_fully_paid = false AND outstanding > 0 AND outstanding < net_total THEN 1 END) as partially_paid,
        COUNT(CASE WHEN is_fully_paid = false AND net_total > 0 AND outstanding = net_total THEN 1 END) as not_paid
      FROM (
        SELECT is_fully_paid,
               outstanding,
               total_amount - CASE WHEN part_id IS NULL THEN COALESCE(item_cost, unit_cost, 0) * quantity ELSE 0 END AS net_total
        FROM sales
      ) s
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
