// app/api/sales/customer-summary/detail/pdf/route.ts
// خروجی PDF راپور انفرادی یک مشتری (شامل تفکیک شرکا و جزئیات معاملات)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildCustomerDetail } from "@/lib/customer-detail";
import { generateCustomerDetailPdf } from "@/lib/customer-detail-pdf";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "lifetime";
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const search = searchParams.get("search") || "";
    const normalizedName = searchParams.get("normalizedName") || "";
    const customerIdRaw = searchParams.get("customerId");
    const customerId =
      customerIdRaw != null && customerIdRaw !== ""
        ? Number(customerIdRaw)
        : undefined;
    const inline = searchParams.get("inline") === "1";

    const data = await buildCustomerDetail({
      period,
      fromDate,
      toDate,
      paymentStatus,
      search,
      normalizedName,
      customerId: Number.isFinite(customerId) ? customerId : undefined,
    });

    const pdf = await generateCustomerDetailPdf(data);

    // سرصفحهٔ HTTP فقط Latin-1 می‌پذیرد؛ نام دقیق (فارسی) را با filename* می‌فرستیم
    const name = data.customer?.customerName || "customer";
    const asciiName = name.replace(/[^\dA-Za-z_-]/g, "") || "customer";
    const filename = `customer-report-${asciiName}.pdf`;
    const utf8Filename = encodeURIComponent(`customer-report-${name}.pdf`);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"; filename*=UTF-8''${utf8Filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generating customer detail PDF:", err);
    return NextResponse.json(
      { success: false, error: "خطا در تولید فایل PDF" },
      { status: 500 },
    );
  }
}
