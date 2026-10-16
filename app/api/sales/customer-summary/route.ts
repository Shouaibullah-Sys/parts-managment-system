// app/api/sales/customer-summary/route.ts
// گزارش خلاصه مشتریان (شامل تفکیک شرکا) — داده‌های تجمعی کامل
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildCustomerSummary } from "@/lib/customer-summary";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const data = await buildCustomerSummary({
      period: searchParams.get("period") || "lifetime",
      fromDate: searchParams.get("fromDate") || "",
      toDate: searchParams.get("toDate") || "",
      paymentStatus: searchParams.get("paymentStatus") || "",
      search: searchParams.get("search") || "",
      normalizedName: searchParams.get("normalizedName") || "",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error building customer summary:", err);
    return NextResponse.json(
      { success: false, error: "خطا در محاسبهٔ خلاصه مشتریان" },
      { status: 500 },
    );
  }
}
