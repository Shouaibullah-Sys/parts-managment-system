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
  amount: z.number().nonnegative(),
  note: z.string().optional(),
  receivedBy: z.string().optional().nullable(),
});

export const addBulkPaymentSchema = z.object({
  customerName: z.string().min(1),
  normalizedName: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  note: z.string().optional(),
  receivedBy: z.string().optional().nullable(),
});
