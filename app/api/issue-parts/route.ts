// app/api/issue-parts/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, inventory, customers, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const body = await request.json();
    const { customerName, items, action } = body;

    if (
      !customerName ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return bad("نام مشتری و قطعات الزامی است");
    }

    // Validate stock availability
    for (const item of items) {
      const stockResult = await db
        .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
        .from(inventory)
        .where(eq(inventory.partId, item.partId));

      const currentStock = Number(stockResult[0]?.stock || 0);

      if (currentStock < item.quantity) {
        return bad(
          `موجودی کافی برای قطعه ${item.partId} وجود ندارد. موجودی: ${currentStock}, درخواستی: ${item.quantity}`
        );
      }
    }

    // Create customer record
    const [customer] = await db
      .insert(customers)
      .values({
        name: customerName,
      })
      .returning();

    // Create sales records and inventory transactions using raw SQL
    const salesRecords = [];

    for (const item of items) {
      const totalAmount = (
        parseFloat(item.unitPrice) * item.quantity
      ).toString();

      // Use raw SQL for sales insertion
      const saleResult = await db.execute(sql`
        INSERT INTO sales (part_id, customer_id, quantity, total_amount, paid_amount, outstanding, is_fully_paid, created_by)
        VALUES (${item.partId}, ${customer.id}, ${item.quantity}, ${totalAmount}, '0', ${totalAmount}, false, ${session.user.id})
        RETURNING id
      `);

      const sale = saleResult.rows[0] as { id: number };
      salesRecords.push(sale);

      // Create inventory transaction
      await db.insert(inventory).values({
        partId: item.partId,
        change: -item.quantity,
        reason: "issue",
        referenceId: sale.id,
        createdBy: session.user.id,
      });
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    if (action === "refer") {
      return ok({
        message: "سند برای تأیید مدیر ارسال شد",
        customerId: customer.id,
        salesCount: salesRecords.length,
        totalAmount: totalAmount,
        action: "referred",
      });
    }

    return ok({
      message: "سند با موفقیت ایجاد شد",
      issueId: customer.id,
      customerId: customer.id,
      salesCount: salesRecords.length,
      totalAmount: totalAmount,
      action: "saved",
    });
  } catch (err) {
    console.error("Error in issue-parts API:", err);
    return serverError(err);
  }
}
