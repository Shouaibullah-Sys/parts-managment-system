// app/api/issue-parts/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, inventory, customers, sales, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { normalizeName } from "@/lib/utils/normalize";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting issue-parts API...");

    const session = await requireAuth(request);
    if (!session?.user) {
      console.log("Unauthorized access attempt");
      return unauthorized();
    }

    console.log("User authenticated:", session.user.id);

    let body;
    try {
      body = await request.json();
      console.log("Request body received");
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return bad("درخواست نامعتبر است");
    }

    const {
      customerName,
      customerPhone,
      customerAddress,
      invoiceDate,
      invoiceNumber,
      notes,
      items,
      action,
    } = body;

    console.log("Validating request data...");

    if (
      !customerName ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      console.log("Validation failed: missing customerName or items");
      return bad("نام مشتری و قطعات الزامی است");
    }

    // Test database connection first
    try {
      console.log("Testing database connection...");
      await db
        .select({ test: sql`1` })
        .from(parts)
        .limit(1);
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return serverError("خطا در اتصال به پایگاه داده");
    }

    // Validate stock availability and collect insufficient stock items
    console.log("Checking stock availability...");
    const insufficientStockItems = [];

    for (const item of items) {
      console.log(
        `Checking stock for part ${item.partId}, quantity: ${item.quantity}`
      );

      // Get part details first to see what stock should be
      const partDetails = await db
        .select()
        .from(parts)
        .where(eq(parts.id, item.partId))
        .limit(1);

      console.log("Part details from database:", partDetails[0]);

      // Use currentStock directly from parts table (consistent with UI display)
      const currentStock = Number(partDetails[0]?.currentStock || 0);
      console.log(
        `Part ${item.partId} current stock from parts table: ${currentStock}`
      );

      if (currentStock < item.quantity) {
        console.log(`Insufficient stock for part ${item.partId}`);

        const partName = partDetails[0]?.name || `قطعه ${item.partId}`;
        insufficientStockItems.push({
          partId: item.partId,
          partName,
          requested: item.quantity,
          available: currentStock,
        });
      }
    }

    // If there are insufficient stock items, return detailed error
    if (insufficientStockItems.length > 0) {
      console.log("Insufficient stock items:", insufficientStockItems);

      const errorMessages = insufficientStockItems.map(
        (item) =>
          `"${item.partName}": موجودی ${item.available}، درخواستی ${item.requested}`
      );

      return bad(
        `موجودی کافی برای قطعات زیر وجود ندارد:\n${errorMessages.join("\n")}`
      );
    }

    console.log("Stock validation passed");

    // Create customer record
    console.log("Creating customer record...");
    const normalizedCustomerName = normalizeName(customerName);
    const [customer] = await db
      .insert(customers)
      .values({
        name: customerName,
        normalizedName: normalizedCustomerName,
        phone: customerPhone || null,
        address: customerAddress || null,
      })
      .returning();

    console.log("Customer created:", customer.id);

    // Create sales records and inventory transactions
    console.log("Creating sales records...");
    const salesRecords = [];

    for (const item of items) {
      const totalAmount = (
        parseFloat(item.unitPrice) * item.quantity
      ).toString();

      console.log(
        `Creating sale for part ${item.partId}, quantity: ${item.quantity}, total: ${totalAmount}`
      );

      try {
        // Use Drizzle's insert instead of raw SQL
        const [sale] = await db
          .insert(sales)
          .values({
            partId: item.partId,
            customerId: customer.id,
            quantity: item.quantity,
            totalAmount: totalAmount,
            paidAmount: "0",
            outstanding: totalAmount,
            isFullyPaid: false,
            createdBy: session.user.id,
            saleDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          })
          .returning();

        console.log("Sale created:", sale.id);
        salesRecords.push(sale);

        // Create inventory transaction
        console.log("Creating inventory transaction...");
        await db.insert(inventory).values({
          partId: item.partId,
          change: -item.quantity,
          reason: "issue",
          referenceId: sale.id,
          createdBy: session.user.id,
        });

        console.log("Inventory transaction created");

        // Update currentStock in parts table
        console.log("Updating current stock in parts table...");
        await db
          .update(parts)
          .set({
            currentStock: sql`${parts.currentStock} - ${item.quantity}`,
          })
          .where(eq(parts.id, item.partId));

        console.log("Current stock updated for part", item.partId);
      } catch (saleError) {
        console.error("Error creating sale:", saleError);
        throw saleError;
      }
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    console.log("Total amount:", totalAmount);

    if (action === "refer") {
      console.log("Action: refer to admin");
      return ok({
        message: "سند برای تأیید مدیر ارسال شد",
        customerId: customer.id,
        salesCount: salesRecords.length,
        totalAmount: totalAmount,
        action: "referred",
      });
    }

    console.log("Action: save completed");
    return ok({
      message: "سند با موفقیت ایجاد شد",
      issueId: customer.id,
      customerId: customer.id,
      salesIds: salesRecords.map((s) => s.id), // Return array of sale IDs
      salesCount: salesRecords.length,
      totalAmount: totalAmount,
      action: "saved",
    });
  } catch (err) {
    console.error("Error in issue-parts API:", err);
    return serverError(err);
  }
}
