// app/api/customers/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { customers } from "@/db/schema";
import { or, like, eq, ilike, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const searchTerm = query.trim();

    // Search by name, normalized name, phone, or ID
    const results = await db
      .select({
        id: customers.id,
        name: customers.name,
        normalizedName: customers.normalizedName,
        phone: customers.phone,
        address: customers.address,
      })
      .from(customers)
      .where(
        or(
          ilike(customers.name, `%${searchTerm}%`),
          ilike(customers.normalizedName, `%${searchTerm}%`),
          ilike(customers.phone, `%${searchTerm}%`),
          eq(
            customers.id,
            isNaN(parseInt(searchTerm)) ? -1 : parseInt(searchTerm)
          )
        )
      )
      .limit(10);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      { success: false, error: "خطا در جستجوی مشتریان" },
      { status: 500 }
    );
  }
}
