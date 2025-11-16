// app/api/reports/lowstock/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";

export async function GET() {
  try {
    const q = await db.execute(/* sql */ `
      SELECT p.id, p.part_number, p.name, p.min_stock, COALESCE(SUM(i.change), 0) AS current_stock
      FROM parts p
      LEFT JOIN inventory_transactions i ON i.part_id = p.id
      GROUP BY p.id, p.part_number, p.name, p.min_stock
      HAVING COALESCE(SUM(i.change), 0) < p.min_stock
    `);
    // db.execute may return shape depending on adapter; handle generically:
    if (q.rows) return NextResponse.json(q.rows);
    return NextResponse.json(q);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
