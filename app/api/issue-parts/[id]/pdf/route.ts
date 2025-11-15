// app/api/issue-parts/[id]/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, inventory, customers, sales, user } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { generateInvoicePDF } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const issueId = parseInt(id);
    if (isNaN(issueId)) {
      return bad("شناسه سند معتبر نیست");
    }

    // Get customer and sales data
    const customerData = await db
      .select()
      .from(customers)
      .where(eq(customers.id, issueId))
      .limit(1);

    if (customerData.length === 0) {
      return bad("سند یافت نشد");
    }

    const customer = customerData[0];

    // Get all sales for this customer
    const salesData = await db
      .select({
        sale: sales,
        part: parts,
        user: user,
      })
      .from(sales)
      .where(eq(sales.customerId, issueId))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .leftJoin(user, eq(sales.createdBy, user.id));

    if (salesData.length === 0) {
      return bad("هیچ فروشی برای این سند یافت نشد");
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      customer,
      sales: salesData,
      issueId,
      createdAt: salesData[0]?.sale.saleDate || new Date(),
      createdBy: salesData[0]?.user?.name || "نامشخص",
    });

    // Convert Buffer to Uint8Array for Response
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    // Return PDF as response
    return new Response(pdfUint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${issueId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    return serverError(err);
  }
}
