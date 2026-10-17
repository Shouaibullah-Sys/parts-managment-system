// app/api/issue-parts/drafts/route.ts
// فهرست پیش‌نویس‌ها — در صفحهٔ /parts/issue نمایش داده می‌شود تا کاربر
// بتواند یک پیش‌نویس را دوباره باز کرده، ویرایش و در نهایت ثبت نهایی کند.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { sales, customers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const rows = await db
      .select({
        issueId: sales.issueId,
        customerId: sales.customerId,
        customerName: customers.name,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sql<Date>`max(${sales.saleDate})`,
        totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        itemCount: sql<number>`count(*)::int`,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.status, "draft"))
      .groupBy(
        sales.issueId,
        sales.customerId,
        customers.name,
        sales.invoiceNumber,
      )
      .orderBy(desc(sql`max(${sales.id})`));

    return ok(
      rows.map((r) => ({
        issueId: r.issueId,
        customerId: r.customerId,
        customerName: r.customerName || "نامشخص",
        invoiceNumber: r.invoiceNumber || null,
        createdAt: r.saleDate
          ? new Date(r.saleDate).toISOString()
          : new Date().toISOString(),
        totalAmount: String(r.totalAmount ?? "0"),
        itemCount: Number(r.itemCount || 0),
      })),
    );
  } catch (err) {
    console.error("Error in issue-parts/drafts API:", err);
    return serverError(err);
  }
}
