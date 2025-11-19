// app/api/issue-parts/[id]/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, customers, sales, user } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { generateInvoicePDF, SaleItem } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;

    // Check if we have sale IDs in query params (new approach)
    const { searchParams } = new URL(request.url);
    const saleIdsParam = searchParams.get("saleIds");

    let salesData;

    if (saleIdsParam) {
      // New approach: fetch specific sales by IDs
      const saleIds = saleIdsParam.split(",").map((id) => parseInt(id.trim()));

      if (saleIds.some(isNaN)) {
        return bad("شناسه‌های فروش معتبر نیستند");
      }

      salesData = await db
        .select({ sale: sales, part: parts, customer: customers, user: user })
        .from(sales)
        .where(inArray(sales.id, saleIds))
        .leftJoin(parts, eq(sales.partId, parts.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .leftJoin(user, eq(sales.createdBy, user.id))
        .orderBy(sales.id);
    } else {
      // Fallback: treat id as customer ID and fetch latest sales
      const customerId = parseInt(id);
      if (isNaN(customerId)) return bad("شناسه مشتری معتبر نیست");

      // Get all sales for this customer ordered by date (latest first)
      salesData = await db
        .select({ sale: sales, part: parts, customer: customers, user: user })
        .from(sales)
        .where(eq(sales.customerId, customerId))
        .leftJoin(parts, eq(sales.partId, parts.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .leftJoin(user, eq(sales.createdBy, user.id))
        .orderBy(desc(sales.saleDate));
    }

    if (salesData.length === 0) return bad("فروش یافت نشد");

    const customer = salesData[0].customer;
    const userInfo = salesData[0].user;

    if (!customer) return bad("مشتری یافت نشد");

    const invoiceCustomer = {
      name: customer.name,
      phone: customer.phone ?? undefined,
      address: customer.address ?? undefined,
    };

    // Map all sales items for this customer into the invoice
    const invoiceSales: SaleItem[] = salesData.map((data) => ({
      sale: {
        quantity: data.sale.quantity,
        totalAmount: data.sale.totalAmount,
      },
      part: data.part
        ? {
            id: data.part.id,
            partNumber: data.part.partNumber,
            name: data.part.name,
            section: data.part.section ?? "E",
            minStock: data.part.minStock ?? 0,
            currentStock: data.part.currentStock ?? 0,
            costPrice: data.part.costPrice,
            salePrice: data.part.salePrice,
            active: data.part.active ?? true,
            createdAt: data.part.createdAt ?? new Date(),
          }
        : null,
      user: userInfo
        ? {
            name: userInfo.name ?? "نامشخص",
          }
        : null,
    }));

    const pdfBuffer = await generateInvoicePDF({
      customer: invoiceCustomer,
      sales: invoiceSales,
      issueId: customer.id,
      createdAt: salesData[0].sale.saleDate ?? new Date(),
      createdBy: userInfo?.name ?? "نامشخص",
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${customer.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    return serverError(err);
  }
}
