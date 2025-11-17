// lib/services/payment.ts
import { db } from "@/db/drizzle";
import { payments, sales, customers, parts } from "@/db/schema";
import { eq, and, isNotNull, gt } from "drizzle-orm";

type AddPaymentInput = {
  saleId: number;
  amount: number;
  note?: string;
  receivedBy?: string | null;
};

type AddBulkPaymentInput = {
  customerName: string;
  normalizedName: string;
  totalAmount: number;
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

export async function addBulkPayment(input: AddBulkPaymentInput) {
  const {
    customerName,
    normalizedName,
    totalAmount,
    note,
    receivedBy = null,
  } = input;

  console.log("🔍 addBulkPayment DEBUG:", {
    customerName,
    normalizedName,
    totalAmount,
    note,
  });

  // Find ALL customers with the same normalized name (handle duplicates)
  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.normalizedName, normalizedName));

  if (customerRows.length === 0) {
    console.error("❌ No customers found with normalized name:", {
      normalizedName,
    });
    throw new Error("Customer not found");
  }

  console.log(
    `� Found ${customerRows.length} customers with name "${customerName}":`,
    customerRows.map((c) => ({ id: c.id, name: c.name }))
  );

  // Get all outstanding sales for ALL customers with this normalized name
  let allOutstandingSales: any[] = [];

  for (const customer of customerRows) {
    const customerSpecificSales = await db
      .select({
        saleId: sales.id,
        customerId: sales.customerId,
        totalAmount: sales.totalAmount,
        outstanding: sales.outstanding,
        partName: parts.name,
      })
      .from(sales)
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(
        and(eq(sales.customerId, customer.id), gt(sales.outstanding, "0"))
      );

    allOutstandingSales = [...allOutstandingSales, ...customerSpecificSales];
  }

  console.log(
    "📊 All outstanding sales across customers:",
    allOutstandingSales
  );

  const outstandingSales = allOutstandingSales.filter(
    (sale) => Number(sale.outstanding) > 0
  );

  console.log("💰 Filtered outstanding sales:", outstandingSales);

  if (outstandingSales.length === 0) {
    console.log(
      "❌ No outstanding payments found for any customer with name:",
      customerName
    );
    throw new Error("No outstanding payments found for this customer");
  }

  const totalOutstanding = outstandingSales.reduce((sum, sale) => {
    const outstanding = Number(sale.outstanding);
    console.log(
      `📝 Adding sale ${sale.saleId} (customer ${sale.customerId}): ${outstanding} (part: ${sale.partName})`
    );
    return sum + outstanding;
  }, 0);

  console.log("🧮 TOTAL OUTSTANDING CALCULATION:", {
    sum: totalOutstanding,
    count: outstandingSales.length,
    requestAmount: totalAmount,
    difference: totalAmount - totalOutstanding,
    customersInvolved: [...new Set(outstandingSales.map((s) => s.customerId))],
  });

  // Allow flexible payment amount - can be any amount up to total outstanding
  if (totalAmount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  // If payment exceeds outstanding, cap it at the total outstanding
  const actualPaymentAmount = Math.min(totalAmount, totalOutstanding);

  if (actualPaymentAmount < totalAmount) {
    console.warn(
      `⚠️ Payment amount (${totalAmount}) exceeds outstanding (${totalOutstanding}). Capping at ${actualPaymentAmount}`
    );
  }

  let remainingAmount = actualPaymentAmount;
  const results = [];

  // Process payments for each sale, distributing the bulk payment
  for (const sale of outstandingSales) {
    const saleOutstanding = Number(sale.outstanding);

    if (remainingAmount <= 0) break;

    const paymentAmount = Math.min(remainingAmount, saleOutstanding);

    if (paymentAmount > 0) {
      // Insert payment record
      await db.insert(payments).values({
        saleId: sale.saleId,
        amount: paymentAmount.toString(),
        note: note
          ? `${note} - پرداخت انبوه برای ${customerName}`
          : `پرداخت انبوه برای ${customerName}`,
        receivedBy,
      });

      // Calculate new amounts for this sale
      const currentSale = await db
        .select()
        .from(sales)
        .where(eq(sales.id, sale.saleId));
      const currentSaleData = currentSale[0];

      if (!currentSaleData) {
        console.error(
          "❌ Sale not found during payment processing:",
          sale.saleId
        );
        continue;
      }

      const currentPaid = Number(currentSaleData.paidAmount);
      const currentOutstanding = Number(currentSaleData.outstanding);

      const newPaid = currentPaid + paymentAmount;
      const newOutstanding = currentOutstanding - paymentAmount;

      // Update sale record
      await db
        .update(sales)
        .set({
          paidAmount: newPaid.toString(),
          outstanding: newOutstanding.toString(),
          isFullyPaid: newOutstanding <= 0,
        })
        .where(eq(sales.id, sale.saleId));

      results.push({
        saleId: sale.saleId,
        customerId: sale.customerId,
        amount: paymentAmount,
        partName: sale.partName || "نامشخص",
        previousOutstanding: currentOutstanding,
        newOutstanding: newOutstanding,
      });

      remainingAmount -= paymentAmount;

      console.log(
        `✅ Processed payment for sale ${sale.saleId} (customer ${sale.customerId}): ${paymentAmount} (part: ${sale.partName})`
      );
    }
  }

  const finalRemainingAmount = Math.max(0, remainingAmount);

  console.log("🎉 Bulk payment completed:", {
    processedPayments: results.length,
    actualPaymentAmount,
    remainingAmount: finalRemainingAmount,
    customersInvolved: [...new Set(results.map((r) => r.customerId))],
    results,
  });

  return {
    customerName,
    totalAmount: actualPaymentAmount,
    processedPayments: results.length,
    remainingAmount: finalRemainingAmount,
    customersInvolved: [...new Set(outstandingSales.map((s) => s.customerId))],
    results,
  };
}
