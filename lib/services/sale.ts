// lib/services/sale.ts
import { db } from "@/db/drizzle";
import { sales, inventory, parts, payments } from "@/db/schema";
import { findOrCreateCustomer } from "./customer";
import { PaymentValidationError } from "./payment";
import { eq, sql } from "drizzle-orm";

type CreateSaleInput = {
  customerName: string;
  partId: number;
  quantity: number;
  totalAmount: number;
  paidAmount?: number;
  createdBy?: string | null;
};

export async function createSale(input: CreateSaleInput) {
  const { customerName, partId, quantity, totalAmount } = input;
  const paidAmount = input.paidAmount ?? 0;
  const createdBy = input.createdBy ?? null;

  const customer = await findOrCreateCustomer(customerName);
  const outstanding = Number(totalAmount) - Number(paidAmount);

  const result = await db.transaction(async (tx) => {
    const sale = await tx
      .insert(sales)
      .values({
        customerId: customer.id,
        partId,
        quantity,
        totalAmount: totalAmount.toString(),
        paidAmount: paidAmount.toString(),
        outstanding: outstanding.toString(),
        isFullyPaid: outstanding <= 0,
        createdBy,
      })
      .returning();

    await tx.insert(inventory).values({
      partId,
      change: -Math.abs(quantity),
      reason: "sale",
      referenceId: sale[0].id,
      createdBy,
    });

    return sale[0];
  });

  return result;
}

type ReturnSaleInput = {
  saleId: number;
  restoreStock?: boolean;
  note?: string;
  createdBy?: string | null;
};

// مرجوعی کامل فروش: بازپرداخت پول پرداخت‌شده، صفر کردن بدهی،
// و اختیاراً برگشت کالا به انبار. فروش مرتجع از گزارش‌ها و درآمد خارج می‌شود.
export async function returnSale(input: ReturnSaleInput) {
  const { saleId, restoreStock = true, note, createdBy = null } = input;

  const saleRows = await db.select().from(sales).where(eq(sales.id, saleId));
  const saleRow = saleRows[0];
  if (!saleRow) throw new Error("Sale not found");
  if (saleRow.returnedAt) {
    throw new PaymentValidationError("این فروش قبلاً مرجوع شده است");
  }

  const refundedAmount = Number(saleRow.paidAmount);
  const quantity = saleRow.quantity;
  const partId = saleRow.partId;

  await db.transaction(async (tx) => {
    if (refundedAmount > 0) {
      await tx.insert(payments).values({
        saleId,
        amount: (-refundedAmount).toString(),
        note: note ? `مرجوعی: ${note}` : "مرجوعی فروش — بازپرداخت کامل",
        receivedBy: createdBy,
      });
    }

    if (restoreStock && partId) {
      // mirror issue-parts: برگشت تراکنش انونتوری + افزایش موجودی ستون current_stock
      await tx.insert(inventory).values({
        partId,
        change: Math.abs(quantity),
        reason: "return",
        referenceId: saleId,
        createdBy,
      });
      await tx
        .update(parts)
        .set({ currentStock: sql`${parts.currentStock} + ${quantity}` })
        .where(eq(parts.id, partId));
    }

    await tx
      .update(sales)
      .set({
        paidAmount: "0",
        outstanding: "0",
        isFullyPaid: false,
        returnedAt: new Date(),
        returnNote: note ?? null,
      })
      .where(eq(sales.id, saleId));
  });

  return {
    saleId,
    refundedAmount,
    stockRestored: Boolean(restoreStock && partId),
    quantity,
  };
}
