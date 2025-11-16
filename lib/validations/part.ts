import { z } from "zod";

export const partFormSchema = z
  .object({
    partNumber: z
      .string()
      .min(1, "Part number is required")
      .max(100, "Part number must be less than 100 characters")
      .regex(
        /^[A-Za-z0-9\-_]+$/,
        "Part number can only contain letters, numbers, hyphens, and underscores"
      ),
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name must be less than 255 characters"),
    section: z
      .string()
      .min(1, "Section is required")
      .max(50, "Section must be less than 50 characters"),
    minStock: z.coerce
      .number()
      .int("Must be a whole number")
      .min(0, "Minimum stock cannot be negative")
      .default(0),
    currentStock: z.coerce
      .number()
      .int("Must be a whole number")
      .min(0, "Current stock cannot be negative")
      .default(0),
    costPrice: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d*\.?\d*$/.test(val),
        "Must be a valid number"
      ),
    salePrice: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d*\.?\d*$/.test(val),
        "Must be a valid number"
      ),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (!data.costPrice || !data.salePrice) return true;
      const cost = parseFloat(data.costPrice);
      const sale = parseFloat(data.salePrice);
      return sale >= cost;
    },
    {
      message: "Sale price must be greater than or equal to cost price",
      path: ["salePrice"],
    }
  )
  .refine(
    (data) => {
      return data.currentStock >= 0;
    },
    {
      message: "Current stock cannot be negative",
      path: ["currentStock"],
    }
  );

export type PartFormData = z.infer<typeof partFormSchema>;
