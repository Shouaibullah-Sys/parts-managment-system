// lib/services/payment.ts
import { db } from "@/db/drizzle";
import { payments, sales, customers, parts, saleDiscounts } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

type AddPaymentInput = {
  saleId: number;
  amount: number;
  note?: string;
  receivedBy?: string | null;
};

export class PaymentValidationError extends Error {}

type AddBulkPaymentInput = {
  customerName: string;
  normalizedName: string;
  totalAmount: number;
  note?: string;
  receivedBy?: string | null;
};

type AddDiscountInput = {
  saleId: number;
  amount: number;
  note?: string;
  createdBy?: string | null;
};

type SettleSaleInput = {
  saleId: number;
  paymentAmount?: number;
  discountAmount?: number;
  paymentNote?: string;
  discountNote?: string;
  receivedBy?: string | null;
  createdBy?: string | null;
};

// ثبت همزمان پرداخت و تخفیف در یک تراکنش واحد
export async function settleSale(input: SettleSaleInput) {
  const {
    saleId,
    paymentAmount = 0,
    discountAmount = 0,
    paymentNote,
    discountNote,
    receivedBy = null,
    createdBy = null,
  } = input;

  const saleRows = await db.select().from(sales).where(eq(sales.id, saleId));
  const saleRow = saleRows[0];
  if (!saleRow) throw new Error("Sale not found");

  const outstanding = Number(saleRow.outstanding);
  const pay = Number(paymentAmount) || 0;
  const disc = Number(discountAmount) || 0;

  if (pay <= 0 && disc <= 0) {
    throw new PaymentValidationError("مبلغ پرداخت یا مبلغ تخفیف را وارد کنید");
  }
  if (outstanding <= 0) {
    throw new PaymentValidationError("این فروش بدهی باقیمانده ندارد");
  }
  if (disc > outstanding + 1e-9) {
    throw new PaymentValidationError(
      `مبلغ تخفیف (${disc.toLocaleString()}) از باقیمانده (${outstanding.toLocaleString()}) بیشتر است`,
    );
  }
  const afterDiscount = outstanding - disc;
  if (pay > afterDiscount + 1e-9) {
    throw new PaymentValidationError(
      `مبلغ پرداخت (${pay.toLocaleString()}) از باقیمانده پس از تخفیف (${afterDiscount.toLocaleString()}) بیشتر است`,
    );
  }

  const newTotal = Number(saleRow.totalAmount) - disc;
  const newDiscount = Number(saleRow.discount || 0) + disc;
  const newPaid = Number(saleRow.paidAmount) + pay;
  const newOutstanding = Math.max(0, newTotal - newPaid);

  await db.transaction(async (tx) => {
    if (disc > 0) {
      await tx.insert(saleDiscounts).values({
        saleId,
        amount: disc.toString(),
        note: discountNote,
        createdBy,
      });
    }
    if (pay > 0) {
      await tx.insert(payments).values({
        saleId,
        amount: pay.toString(),
        note: paymentNote,
        receivedBy,
      });
    }
    await tx
      .update(sales)
      .set({
        totalAmount: newTotal.toString(),
        discount: newDiscount.toString(),
        paidAmount: newPaid.toString(),
        outstanding: newOutstanding.toString(),
        isFullyPaid: newOutstanding <= 1e-9,
      })
      .where(eq(sales.id, saleId));
  });

  return {
    saleId,
    newTotal,
    newDiscount,
    newPaid,
    newOutstanding,
    isFullyPaid: newOutstanding <= 1e-9,
    discountApplied: disc,
    paymentApplied: pay,
  };
}

// تخفیف / بخشش بدهی: از totalAmount کم می‌شود، بنابراین جزو درآمد نیست
export async function applySaleDiscount(input: AddDiscountInput) {
  const { saleId, amount, note, createdBy = null } = input;

  const saleRows = await db.select().from(sales).where(eq(sales.id, saleId));
  const saleRow = saleRows[0];
  if (!saleRow) throw new Error("Sale not found");

  const outstanding = Number(saleRow.outstanding);
  const amountNum = Number(amount);

  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new PaymentValidationError("مبلغ تخفیف باید بیشتر از صفر باشد");
  }
  if (outstanding <= 0) {
    throw new PaymentValidationError(
      "این فروش بدهی باقیمانده ندارد و نمی‌توان تخفیف داد",
    );
  }

  if (amountNum > outstanding + 1e-9) {
    throw new PaymentValidationError(
      `مبلغ تخفیف (${amountNum.toLocaleString()}) از باقیمانده (${outstanding.toLocaleString()}) بیشتر است`,
    );
  }

  const newTotal = Number(saleRow.totalAmount) - amountNum;
  const newDiscount = Number(saleRow.discount || 0) + amountNum;
  const newOutstanding = newTotal - Number(saleRow.paidAmount);

  const updated = await db.transaction(async (tx) => {
    await tx.insert(saleDiscounts).values({
      saleId,
      amount: amountNum.toString(),
      note,
      createdBy,
    });

    const rows = await tx
      .update(sales)
      .set({
        totalAmount: newTotal.toString(),
        discount: newDiscount.toString(),
        outstanding: newOutstanding.toString(),
        isFullyPaid: newOutstanding <= 0,
      })
      .where(eq(sales.id, saleId))
      .returning();

    return rows[0];
  });

  return {
    saleId: updated.id,
    newTotal,
    newDiscount,
    newOutstanding: Math.max(0, newOutstanding),
    isFullyPaid: newOutstanding <= 0,
  };
}

export async function addPayment(input: AddPaymentInput) {
  const { saleId, amount, note, receivedBy = null } = input;

  // First, get the current sale record
  const saleRows = await db.select().from(sales).where(eq(sales.id, saleId));

  const saleRow = saleRows[0];
  if (!saleRow) throw new Error("Sale not found");

  const outstanding = Number(saleRow.outstanding);
  const amountNum = Number(amount);

  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new PaymentValidationError("مبلغ پرداخت باید بیشتر از صفر باشد");
  }
  if (outstanding <= 0) {
    throw new PaymentValidationError("این فروش بدهی باقیمانده ندارد");
  }
  if (amountNum > outstanding + 1e-9) {
    throw new PaymentValidationError(
      `مبلغ پرداخت (${amountNum.toLocaleString()}) از باقیمانده (${outstanding.toLocaleString()}) بیشتر است`,
    );
  }

  const newPaid = Number(saleRow.paidAmount) + amountNum;
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

type RefundInput = {
  saleId: number;
  amount: number;
  note?: string;
  createdBy?: string | null;
};

export async function refundPayment(input: RefundInput) {
  const { saleId, amount, note, createdBy = null } = input;

  const saleRows = await db.select().from(sales).where(eq(sales.id, saleId));
  const saleRow = saleRows[0];
  if (!saleRow) throw new Error("Sale not found");

  const paidAmount = Number(saleRow.paidAmount);
  const amountNum = Number(amount);

  if (paidAmount <= 0) {
    throw new PaymentValidationError("این فروش مبلغ پرداخت‌شده‌ای ندارد");
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new PaymentValidationError("مبلغ بازپرداخت باید بیشتر از صفر باشد");
  }
  if (amountNum > paidAmount + 1e-9) {
    throw new PaymentValidationError(
      `مبلغ بازپرداخت (${amountNum.toLocaleString()}) از مبلغ پرداخت شده (${paidAmount.toLocaleString()}) بیشتر است`,
    );
  }

  // totalAmount is already net of discount — do not subtract discount again
  const newPaid = paidAmount - amountNum;
  const newTotal = Number(saleRow.totalAmount);
  const newOutstanding = Math.max(0, newTotal - newPaid);

  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      saleId,
      amount: (-amountNum).toString(),
      note: note ? `بازپرداخت: ${note}` : "بازپرداخت",
      receivedBy: createdBy,
    });

    await tx
      .update(sales)
      .set({
        paidAmount: newPaid.toString(),
        outstanding: newOutstanding.toString(),
        isFullyPaid: newOutstanding <= 1e-9,
      })
      .where(eq(sales.id, saleId));
  });

  return {
    saleId,
    refundedAmount: amountNum,
    newPaid,
    newOutstanding,
    isFullyPaid: newOutstanding <= 1e-9,
  };
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
    customerRows.map((c) => ({ id: c.id, name: c.name })),
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
        and(eq(sales.customerId, customer.id), gt(sales.outstanding, "0")),
      );

    allOutstandingSales = [...allOutstandingSales, ...customerSpecificSales];
  }

  console.log(
    "📊 All outstanding sales across customers:",
    allOutstandingSales,
  );

  const outstandingSales = allOutstandingSales.filter(
    (sale) => Number(sale.outstanding) > 0,
  );

  console.log("💰 Filtered outstanding sales:", outstandingSales);

  if (outstandingSales.length === 0) {
    console.log(
      "❌ No outstanding payments found for any customer with name:",
      customerName,
    );
    throw new Error("No outstanding payments found for this customer");
  }

  const totalOutstanding = outstandingSales.reduce((sum, sale) => {
    const outstanding = Number(sale.outstanding);
    console.log(
      `📝 Adding sale ${sale.saleId} (customer ${sale.customerId}): ${outstanding} (part: ${sale.partName})`,
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
      `⚠️ Payment amount (${totalAmount}) exceeds outstanding (${totalOutstanding}). Capping at ${actualPaymentAmount}`,
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
          sale.saleId,
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
        `✅ Processed payment for sale ${sale.saleId} (customer ${sale.customerId}): ${paymentAmount} (part: ${sale.partName})`,
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
