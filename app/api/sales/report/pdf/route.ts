// app/api/sales/report/pdf/route.ts
// خروجی PDF راپور فروش (بر اساس بازه و فیلترهای دیالوگ)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchSalesData } from "@/lib/sales-query";
import { generateSalesReportPdf } from "@/lib/sales-report-pdf";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const search = searchParams.get("search") || "";
    const inline = searchParams.get("inline") === "1";

    const result = await fetchSalesData({
      page: 1,
      limit: 100000,
      period: "lifetime",
      fromDate,
      toDate,
      paymentStatus,
      search,
      excludeReturned: true,
    });

    const pdf = await generateSalesReportPdf({
      rows: result.data,
      summary: result.summary,
      from: fromDate,
      to: toDate,
      filters: { paymentStatus, search },
    });

    const filename = `sales-report-${fromDate || "all"}_${toDate || "all"}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generating sales report PDF:", err);
    return NextResponse.json(
      { success: false, error: "خطا در تولید فایل PDF" },
      { status: 500 },
    );
  }
}
