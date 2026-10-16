// app/api/sales/customer-summary/pdf/route.ts
// خروجی PDF گزارش «خلاصه مشتریان و شرکا»
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildCustomerSummary } from "@/lib/customer-summary";
import { generateCustomerSummaryPdf } from "@/lib/customer-summary-pdf";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "lifetime";
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const search = searchParams.get("search") || "";
    const normalizedName = searchParams.get("normalizedName") || "";
    const inline = searchParams.get("inline") === "1";

    const data = await buildCustomerSummary({
      period,
      fromDate,
      toDate,
      paymentStatus,
      search,
      normalizedName,
    });

    const pdf = await generateCustomerSummaryPdf(data, {
      from: fromDate,
      to: toDate,
      period,
      paymentStatus,
      search,
    });

    const safe = (v: string) => v.replace(/[^\dA-Za-z_-]/g, "") || "all";
    const filename = `customer-summary-${safe(fromDate)}_${safe(toDate)}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generating customer summary PDF:", err);
    return NextResponse.json(
      { success: false, error: "خطا در تولید فایل PDF" },
      { status: 500 },
    );
  }
}
