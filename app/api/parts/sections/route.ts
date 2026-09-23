// app/api/parts/sections/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { parts, sales } from "@/db/schema";
import { eq, and, gte, lte, sql, type SQL } from "drizzle-orm";
import { parseISO, isValid } from "date-fns";

// GET: distinct part sections with sales counts (optionally within a date range)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";

    // Date conditions go in the JOIN (not WHERE) so parts with zero
    // matching sales still appear with a count of 0.
    const joinConditions: (SQL | undefined)[] = [eq(sales.partId, parts.id)];

    if (fromDate) {
      const fromDateObj = parseISO(fromDate);
      if (isValid(fromDateObj)) {
        joinConditions.push(gte(sales.saleDate, fromDateObj));
      }
    }
    if (toDate) {
      const toDateObj = parseISO(toDate);
      if (isValid(toDateObj)) {
        const endOfDay = new Date(toDateObj);
        endOfDay.setHours(23, 59, 59, 999);
        joinConditions.push(lte(sales.saleDate, endOfDay));
      }
    }

    const rows = await db
      .select({
        section: parts.section,
        salesCount: sql<number>`COUNT(${sales.id})::int`,
      })
      .from(parts)
      .leftJoin(sales, and(...joinConditions))
      .where(eq(parts.active, true))
      .groupBy(parts.section)
      .orderBy(parts.section);

    // Normalize null sections to default "E"
    const data = rows.map((r) => ({
      section: r.section || "E",
      salesCount: r.salesCount,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Error fetching sections:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
