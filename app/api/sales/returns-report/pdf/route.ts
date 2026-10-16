// app/api/sales/returns-report/pdf/route.ts
// خروجی PDF راپور مرجوعیات (بر اساس بازه)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchSalesData } from "@/lib/sales-query";
import { generateReturnsReportPdf } from "@/lib/sales-report-pdf";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const inline = searchParams.get("inline") === "1";

    const result = await fetchSalesData({
      page: 1,
      limit: 100000,
      period: "lifetime",
      fromDate,
      toDate,
      search: "",
      returnedOnly: true,
    });

    const pdf = await generateReturnsReportPdf({
      rows: result.data,
      from: fromDate,
      to: toDate,
    });

    const filename = `returns-report-${fromDate || "all"}_${toDate || "all"}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generating returns report PDF:", err);
    return NextResponse.json(
      { success: false, error: "خطا در تولید فایل PDF" },
      { status: 500 },
    );
  }
}
