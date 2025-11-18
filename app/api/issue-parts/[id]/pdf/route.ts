// app/api/issue-parts/[id]/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, customers, sales, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInvoicePDF, SaleItem } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const salesId = parseInt(id);
    if (isNaN(salesId)) return bad("شناسه فروش معتبر نیست");

    // Get sale data with all necessary joins in one query
    const salesData = await db
      .select({ sale: sales, part: parts, customer: customers, user: user })
      .from(sales)
      .where(eq(sales.id, salesId))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(user, eq(sales.createdBy, user.id))
      .limit(1);

    if (salesData.length === 0) return bad("فروش یافت نشد");

    const sale = salesData[0].sale;
    const customer = salesData[0].customer;
    const userInfo = salesData[0].user;

    if (!customer) return bad("مشتری یافت نشد");

    const invoiceCustomer = {
      name: customer.name,
      phone: customer.phone ?? undefined,
      address: customer.address ?? undefined,
    };

    const invoiceSales: SaleItem[] = [
      {
        sale: {
          quantity: sale.quantity,
          totalAmount: sale.totalAmount,
        },
        part: salesData[0].part
          ? {
              id: salesData[0].part.id,
              partNumber: salesData[0].part.partNumber,
              name: salesData[0].part.name,
              section: salesData[0].part.section ?? "E",
              minStock: salesData[0].part.minStock ?? 0,
              currentStock: salesData[0].part.currentStock ?? 0,
              costPrice: salesData[0].part.costPrice,
              salePrice: salesData[0].part.salePrice,
              active: salesData[0].part.active ?? true,
              createdAt: salesData[0].part.createdAt ?? new Date(),
            }
          : null,
        user: userInfo
          ? {
              name: userInfo.name ?? "نامشخص",
            }
          : null,
      },
    ];

    const pdfBuffer = await generateInvoicePDF({
      customer: invoiceCustomer,
      sales: invoiceSales,
      issueId: salesId,
      createdAt: sale.saleDate ?? new Date(),
      createdBy: userInfo?.name ?? "نامشخص",
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${salesId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    return serverError(err);
  }
}
