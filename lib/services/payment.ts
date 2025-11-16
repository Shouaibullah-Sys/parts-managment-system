// lib/services/payment.ts
import { db } from "@/db/drizzle";
import { payments, sales } from "@/db/schema";
import { eq } from "drizzle-orm";

type AddPaymentInput = {
  saleId: number;
  amount: number;
  note?: string;
  receivedBy?: string | null;
};

export async function addPayment(input: AddPaymentInput) {
  const { saleId, amount, note, receivedBy = null } = input;

  return await db.transaction(async (tx) => {
    const saleRow = (
      await tx.select().from(sales).where(eq(sales.id, saleId))
    )[0];
    if (!saleRow) throw new Error("Sale not found");

    const newPaid = Number(saleRow.paidAmount) + Number(amount);
    const newOutstanding = Number(saleRow.totalAmount) - newPaid;

    await tx.insert(payments).values({
      saleId,
      amount: amount.toString(),
      note,
      receivedBy,
    });

    await tx
      .update(sales)
      .set({
        paidAmount: newPaid.toString(),
        outstanding: newOutstanding.toString(),
        isFullyPaid: newOutstanding <= 0,
      })
      .where(eq(sales.id, saleId));

    return { newPaid, newOutstanding };
  });
}
