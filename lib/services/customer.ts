// lib/services/customer.ts
import { db } from "@/db/drizzle";
import { customers, sales, payments } from "@/db/schema";
import { normalizeName } from "../utils/normalize";
import { eq, sum } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function findOrCreateCustomer(
  rawName: string,
  phone?: string,
  address?: string
) {
  const norm = normalizeName(rawName);
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.normalizedName, norm));
  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(customers)
    .values({ name: rawName, normalizedName: norm, phone, address })
    .returning();
  return inserted[0];
}

export async function getCustomerById(id: number) {
  const rows = await db.select().from(customers).where(eq(customers.id, id));
  return rows[0] || null;
}

// Efficient balance calculation using Drizzle ORM
export async function getCustomerBalance(id: number) {
  // Get total sales for this customer
  const salesResult = await db
    .select({
      totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
    })
    .from(sales)
    .where(eq(sales.customerId, id));

  const totalSales = Number(salesResult[0]?.totalSales ?? 0);

  // Get total payments for this customer's sales
  const paymentsResult = await db
    .select({
      totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(sales, eq(payments.saleId, sales.id))
    .where(eq(sales.customerId, id));

  const totalPaid = Number(paymentsResult[0]?.totalPaid ?? 0);

  return { totalSales, totalPaid, outstanding: totalSales - totalPaid };
}
