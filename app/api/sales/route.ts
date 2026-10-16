// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { createSale } from "@/lib/services/sale";
import { createSaleSchema } from "@/lib/validation/schemas";
import { fetchSalesData } from "@/lib/sales-query";

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
    const normalizedName = searchParams.get("normalizedName") || "";
    const paymentStatus = searchParams.get("paymentStatus") || ""; // "paid" | "outstanding" | ""
    const excludeReturned = searchParams.get("excludeReturned") === "true";
    const returnedOnly = searchParams.get("returnedOnly") === "true";

    // Fetch sales data with the filters
    const salesData = await fetchSalesData({
      page,
      limit,
      search,
      fromDate,
      toDate,
      period,
      normalizedName,
      paymentStatus,
      excludeReturned,
      returnedOnly,
    });

    return NextResponse.json({
      success: true,
      data: salesData.data,
      pagination: salesData.pagination,
      summary: salesData.summary,
    });
  } catch (err: any) {
    console.error("Error fetching sales data:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
