// lib/validation/schemas.ts
import { z } from "zod";

export const findOrCreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const createSaleSchema = z.object({
  customerName: z.string().min(1),
  partId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().optional(),
  createdBy: z.string().optional().nullable(),
});

export const addPaymentSchema = z.object({
  saleId: z.number().int().positive(),
  amount: z.number().positive(),
  note: z.string().optional(),
  receivedBy: z.string().optional().nullable(),
});

export const addDiscountSchema = z.object({
  saleId: z.number().int().positive(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export const settleSaleSchema = z
  .object({
    saleId: z.number().int().positive(),
    paymentAmount: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    paymentNote: z.string().optional(),
    discountNote: z.string().optional(),
  })
  .refine(
    (d) => (d.paymentAmount || 0) > 0 || (d.discountAmount || 0) > 0,
    { message: "مبلغ پرداخت یا مبلغ تخفیف را وارد کنید" }
  );

export const addBulkPaymentSchema = z.object({
  customerName: z.string().min(1),
  normalizedName: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  note: z.string().optional(),
  receivedBy: z.string().optional().nullable(),
});
