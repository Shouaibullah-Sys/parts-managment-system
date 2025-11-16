// lib/services/sale.ts
import { db } from "@/db/drizzle";
import { sales, inventory } from "@/db/schema";
import { findOrCreateCustomer } from "./customer";

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
