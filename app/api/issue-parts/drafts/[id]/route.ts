// app/api/issue-parts/drafts/[id]/route.ts
// جزئیات یک پیش‌نویس برای بارگذاری مجدد در فرم صدور، و حذف پیش‌نویس.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import {
  ok,
  bad,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { sales, customers, parts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    if (!id) return bad("شناسه نامعتبر است");

    const rows = await db
      .select({
        saleId: sales.id,
        partId: sales.partId,
        partName: parts.name,
        partNumber: parts.partNumber,
        itemName: sales.itemName,
        itemCost: sales.itemCost,
        supplierId: sales.supplierId,
        supplierName: sales.supplierName,
        quantity: sales.quantity,
        totalAmount: sales.totalAmount,
        status: sales.status,
        customerId: sales.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(eq(sales.issueId, id))
      .orderBy(sales.id);

    if (rows.length === 0) return notFound("پیش‌نویس یافت نشد");
    if (rows.some((r) => r.status !== "draft")) {
      return bad("این سند پیش‌نویس نیست");
    }

    const first = rows[0];
    const items = rows.map((l) => {
      const qty = Number(l.quantity || 0);
      const total = Number(l.totalAmount || 0);
      const isExternal = l.partId == null;
      return {
        saleId: l.saleId,
        partId: l.partId,
        partNumber: l.partNumber || "",
        name: l.partName || l.itemName || "",
        isExternal,
        itemName: isExternal ? l.itemName || "" : null,
        itemCost: l.itemCost != null ? Number(l.itemCost) : 0,
        supplierId: l.supplierId ?? null,
        supplierName: l.supplierName ?? null,
        quantity: qty,
        unitPrice: qty > 0 ? total / qty : total,
      };
    });

    const isoDate = first.saleDate
      ? new Date(first.saleDate).toISOString()
      : new Date().toISOString();

    return ok({
      issueId: id,
      customerId: first.customerId,
      customerName: first.customerName || "",
      customerPhone: first.customerPhone || "",
      customerAddress: first.customerAddress || "",
      invoiceNumber: first.invoiceNumber || "",
      invoiceDate: isoDate.split("T")[0],
      items,
    });
  } catch (err) {
    console.error("Error in issue-parts/drafts/[id] API:", err);
    return serverError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    if (!id) return bad("شناسه نامعتبر است");

    const rows = await db
      .select({ status: sales.status })
      .from(sales)
      .where(eq(sales.issueId, id));

    if (rows.length === 0) return notFound("پیش‌نویس یافت نشد");
    if (rows.some((r) => r.status !== "draft")) {
      return bad("این سند پیش‌نویس نیست و حذف نمی‌شود");
    }

    await db.delete(sales).where(eq(sales.issueId, id));

    return ok({ message: "پیش‌نویس حذف شد" });
  } catch (err) {
    console.error("Error deleting draft:", err);
    return serverError(err);
  }
}
