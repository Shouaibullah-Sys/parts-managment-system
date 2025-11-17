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

  // First, get the current sale record
  const saleRows = await db.select().from(sales).where(eq(sales.id, saleId));

  const saleRow = saleRows[0];
  if (!saleRow) throw new Error("Sale not found");

  const newPaid = Number(saleRow.paidAmount) + Number(amount);
  const newOutstanding = Number(saleRow.totalAmount) - newPaid;

  // Insert the payment record
  await db.insert(payments).values({
    saleId,
    amount: amount.toString(),
    note,
    receivedBy,
  });

  // Update the sale record
  await db
    .update(sales)
    .set({
      paidAmount: newPaid.toString(),
      outstanding: newOutstanding.toString(),
      isFullyPaid: newOutstanding <= 0,
    })
    .where(eq(sales.id, saleId));

  return { newPaid, newOutstanding };
}
