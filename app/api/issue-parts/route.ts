// app/api/issue-parts/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, inventory, customers, sales, partners, suppliers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { normalizeName } from "@/lib/utils/normalize";

// بل در دو مرحله ذخیره می‌شود:
//   action: "draft"     → پیش‌نویس (بدون اثر روی موجودی و بدون رکورد انبار)
//   action: "finalize"  → ثبت نهایی (کسر موجودی + رکورد انبار). action قدیمی
//                          "save" هم به‌عنوان ثبت نهایی پذیرفته می‌شود.
// اگر issueId فرستاده شود و آن سند پیش‌نویس باشد، به‌جای ساخت بل جدید،
// همان پیش‌نویس بازنویسی می‌شود. اسناد نهایی قابل بازنویسی نیستند.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    let body;
    try {
      body = await request.json();
    } catch {
      return bad("درخواست نامعتبر است");
    }

    const {
      customerName,
      customerPhone,
      customerAddress,
      invoiceDate,
      invoiceNumber,
      items,
      action,
      issueId: incomingIssueId,
    } = body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return bad("نام مشتری و قطعات الزامی است");
    }

    const status: "draft" | "final" = action === "draft" ? "draft" : "final";

    // پرزه خارجی: kind === "external" (یا بدون partId و با نام).
    // این پرزه‌ها فقط وارد بل/مالی می‌شوند و به موجودی انبار کاری ندارند.
    const isExternalItem = (item: any) =>
      item.kind === "external" || (!item.partId && !!item.itemName);

    const invalidExternalItem = items.find(
      (item: any) =>
        isExternalItem(item) &&
        (!String(item.itemName || "").trim() || Number(item.quantity) < 1),
    );
    if (invalidExternalItem) {
      return bad("نام و تعداد پرزه خارجی الزامی است");
    }

    // Test database connection first
    try {
      await db.select({ test: sql`1` }).from(parts).limit(1);
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return serverError("خطا در اتصال به پایگاه داده");
    }

    // فقط ثبت نهایی به موجودی نیاز دارد؛ پیش‌نویس یک «طرح» است و اجازه دارد
    // موجودی نداشته باشد. هنگام ثبت نهایی کمبود را با جزئیات برمی‌گردانیم.
    if (status === "final") {
      const stockItems = items.filter((item: any) => !isExternalItem(item));
      const insufficientStockItems: {
        partName: string;
        requested: number;
        available: number;
      }[] = [];

      for (const item of stockItems) {
        const [partDetails] = await db
          .select()
          .from(parts)
          .where(eq(parts.id, item.partId))
          .limit(1);
        const currentStock = Number(partDetails?.currentStock || 0);
        if (currentStock < item.quantity) {
          insufficientStockItems.push({
            partName: partDetails?.name || `قطعه ${item.partId}`,
            requested: item.quantity,
            available: currentStock,
          });
        }
      }

      if (insufficientStockItems.length > 0) {
        const errorMessages = insufficientStockItems.map(
          (item) =>
            `"${item.partName}": موجودی ${item.available}، درخواستی ${item.requested}`,
        );
        return bad(
          `موجودی کافی برای قطعات زیر وجود ندارد:\n${errorMessages.join("\n")}`,
        );
      }
    }

    const normalizedCustomerName = normalizeName(customerName);
    const invoiceNumberValue =
      typeof invoiceNumber === "string" && invoiceNumber.trim() !== ""
        ? invoiceNumber.trim().slice(0, 100)
        : null;
    const saleDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const targetIssueId =
      typeof incomingIssueId === "string" && incomingIssueId.trim() !== ""
        ? incomingIssueId.trim()
        : null;

    // شریک FM — فروش مستقیم (پرزه از فروشگاه دیگر)؛ سود ۱۰۰٪ مغازه (درصد ۰)
    const [fmPartner] = await db
      .select({ id: partners.id })
      .from(partners)
      .where(eq(partners.name, "FM"))
      .limit(1);

    const issueId = targetIssueId ?? randomUUID();
    let customerId: number | null = null;

    type TxnResult = { error: "notFound" | "locked" } | { salesIds: number[] };

    const result: TxnResult = await db.transaction(async (tx) => {
      // بازنویسی پیش‌نویس موجود: باید متعلق به همین گروه و پیش‌نویس باشد.
      if (targetIssueId) {
        const existingRows = await tx
          .select({
            id: sales.id,
            status: sales.status,
            customerId: sales.customerId,
          })
          .from(sales)
          .where(eq(sales.issueId, targetIssueId));

        if (existingRows.length === 0) return { error: "notFound" } as const;
        if (existingRows.some((r) => r.status !== "draft")) {
          return { error: "locked" } as const;
        }

        customerId = existingRows[0].customerId ?? null;
        await tx.delete(sales).where(eq(sales.issueId, targetIssueId));
      }

      // مشتری: پیش‌نویس موجود مشتری‌اش را به‌روز می‌کند، وگرنه مشتری جدید.
      if (customerId != null) {
        await tx
          .update(customers)
          .set({
            name: customerName,
            normalizedName: normalizedCustomerName,
            phone: customerPhone || null,
            address: customerAddress || null,
          })
          .where(eq(customers.id, customerId));
      } else {
        const [customer] = await tx
          .insert(customers)
          .values({
            name: customerName,
            normalizedName: normalizedCustomerName,
            phone: customerPhone || null,
            address: customerAddress || null,
          })
          .returning();
        customerId = customer.id;
      }

      const salesIds: number[] = [];

      for (const item of items) {
        const totalAmount = (
          parseFloat(item.unitPrice) * item.quantity
        ).toString();

        // پرزه خارجی — فقط رکورد مالی در sales، بدون موجودی/انبار
        if (isExternalItem(item)) {
          let supplierId: number | null = null;
          let supplierName: string | null = null;
          const rawSupplierId = Number(item.supplierId);
          if (Number.isInteger(rawSupplierId) && rawSupplierId > 0) {
            const [supplierRow] = await tx
              .select({ id: suppliers.id, name: suppliers.name })
              .from(suppliers)
              .where(eq(suppliers.id, rawSupplierId))
              .limit(1);
            if (supplierRow) {
              supplierId = supplierRow.id;
              supplierName = supplierRow.name;
            }
          } else if (
            item.supplierName != null &&
            String(item.supplierName).trim() !== ""
          ) {
            supplierName = String(item.supplierName).trim();
          }

          // پرزهٔ خارجی: مغازه فقط سود را وصول می‌کند؛ بهای خرید به فروشگاه
          // دیگر پرداخت می‌شود و قابل وصول از مشتری نیست.
          const externalUnitCost =
            item.itemCost != null && String(item.itemCost).trim() !== ""
              ? Number(item.itemCost)
              : 0;
          const externalNet = Math.max(
            0,
            Number(totalAmount) - externalUnitCost * item.quantity,
          );

          const [externalSale] = await tx
            .insert(sales)
            .values({
              partId: null,
              itemName: String(item.itemName).trim(),
              itemCost:
                item.itemCost != null && String(item.itemCost).trim() !== ""
                  ? String(item.itemCost)
                  : null,
              customerId,
              quantity: item.quantity,
              totalAmount: totalAmount,
              paidAmount: "0",
              outstanding: externalNet.toString(),
              isFullyPaid: externalNet <= 0,
              createdBy: session.user.id,
              saleDate,
              // اسنپ‌شات: فروش مستقیم به شریک FM تعلق دارد (سود ۱۰۰٪ مغازه)
              partnerId: fmPartner?.id ?? null,
              unitCost:
                item.itemCost != null && String(item.itemCost).trim() !== ""
                  ? String(item.itemCost)
                  : null,
              supplierId,
              supplierName,
              issueId,
              invoiceNumber: invoiceNumberValue,
              status,
            })
            .returning({ id: sales.id });

          salesIds.push(externalSale.id);
          continue;
        }

        const [stockPart] = await tx
          .select({
            partnerId: parts.partnerId,
            costPrice: parts.costPrice,
          })
          .from(parts)
          .where(eq(parts.id, item.partId))
          .limit(1);

        const [sale] = await tx
          .insert(sales)
          .values({
            partId: item.partId,
            customerId,
            quantity: item.quantity,
            totalAmount: totalAmount,
            paidAmount: "0",
            outstanding: totalAmount,
            isFullyPaid: false,
            createdBy: session.user.id,
            saleDate,
            // اسنپ‌شات لحظهٔ فروش (گزارش سود شرکا)
            partnerId: stockPart?.partnerId ?? null,
            unitCost: stockPart?.costPrice ?? null,
            issueId,
            invoiceNumber: invoiceNumberValue,
            status,
          })
          .returning({ id: sales.id });

        salesIds.push(sale.id);

        // پیش‌نویس به انبار دست نمی‌زند؛ فقط ثبت نهایی موجودی را کم می‌کند.
        if (status === "final") {
          await tx.insert(inventory).values({
            partId: item.partId,
            change: -item.quantity,
            reason: "issue",
            referenceId: sale.id,
            createdBy: session.user.id,
          });

          await tx
            .update(parts)
            .set({
              currentStock: sql`${parts.currentStock} - ${item.quantity}`,
            })
            .where(eq(parts.id, item.partId));
        }
      }

      return { salesIds };
    });

    if ("error" in result) {
      if (result.error === "notFound") return bad("پیش‌نویس یافت نشد", 404);
      return bad("این سند نهایی شده و قابل ویرایش نیست");
    }

    const totalAmount = items.reduce(
      (sum: number, item: any) =>
        sum + parseFloat(item.unitPrice) * item.quantity,
      0,
    );

    return ok({
      message: status === "draft" ? "پیش‌نویس ذخیره شد" : "سند با موفقیت ایجاد شد",
      issueId,
      customerId,
      salesIds: result.salesIds,
      salesCount: result.salesIds.length,
      totalAmount,
      status,
      action: status === "draft" ? "drafted" : "finalized",
    });
  } catch (err) {
    console.error("Error in issue-parts API:", err);
    return serverError(err);
  }
}
