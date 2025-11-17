// app/api/debug/customer-data/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { customers, sales, parts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    const normalizedName = url.searchParams.get("normalizedName");

    // Build the base query
    let results;

    if (conditionsExist(customerId, normalizedName)) {
      // Query with conditions
      results = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          normalizedName: customers.normalizedName,
          salesId: sales.id,
          saleAmount: sales.totalAmount,
          paidAmount: sales.paidAmount,
          outstanding: sales.outstanding,
          isFullyPaid: sales.isFullyPaid,
          partName: parts.name,
          partNumber: parts.partNumber,
          saleDate: sales.saleDate,
        })
        .from(customers)
        .leftJoin(sales, eq(sales.customerId, customers.id))
        .leftJoin(parts, eq(sales.partId, parts.id))
        .where(buildConditions(customerId, normalizedName))
        .orderBy(customers.id, sales.id);
    } else {
      // Query without conditions
      results = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          normalizedName: customers.normalizedName,
          salesId: sales.id,
          saleAmount: sales.totalAmount,
          paidAmount: sales.paidAmount,
          outstanding: sales.outstanding,
          isFullyPaid: sales.isFullyPaid,
          partName: parts.name,
          partNumber: parts.partNumber,
          saleDate: sales.saleDate,
        })
        .from(customers)
        .leftJoin(sales, eq(sales.customerId, customers.id))
        .leftJoin(parts, eq(sales.partId, parts.id))
        .orderBy(customers.id, sales.id);
    }

    // Group data by customer
    const customerData = new Map();

    for (const row of results) {
      if (!customerData.has(row.customerId)) {
        customerData.set(row.customerId, {
          customerId: row.customerId,
          customerName: row.customerName,
          normalizedName: row.normalizedName,
          totalSales: 0,
          totalOutstanding: 0,
          sales: [],
        });
      }

      const customer = customerData.get(row.customerId);

      if (row.salesId) {
        customer.totalSales++;
        const outstanding = Number(row.outstanding || 0);
        customer.totalOutstanding += outstanding;

        customer.sales.push({
          saleId: row.salesId,
          partName: row.partName,
          partNumber: row.partNumber,
          totalAmount: Number(row.saleAmount || 0),
          paidAmount: Number(row.paidAmount || 0),
          outstanding: outstanding,
          isFullyPaid: row.isFullyPaid,
          saleDate: row.saleDate,
        });
      }
    }

    const formattedData = Array.from(customerData.values());

    return Response.json({
      success: true,
      data: formattedData,
      message: `Found data for ${formattedData.length} customers`,
    });
  } catch (error) {
    console.error("❌ Error in customer data debug:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to get customer data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName } = body;

    if (!customerName) {
      return Response.json(
        { success: false, error: "customerName is required" },
        { status: 400 }
      );
    }

    // Normalize the customer name (same logic as in payment service)
    const normalizedName = customerName
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Create a new request URL with the normalized name
    const url = new URL(request.url);
    url.searchParams.set("normalizedName", normalizedName);

    // Create a new request and call GET
    const newRequest = new NextRequest(url.toString(), {
      method: "GET",
      headers: request.headers,
    });

    return await GET(newRequest);
  } catch (error) {
    console.error("❌ Error in customer data POST:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to process customer data request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper functions
function conditionsExist(
  customerId?: string | null,
  normalizedName?: string | null
): boolean {
  return !!(customerId || normalizedName);
}

function buildConditions(
  customerId?: string | null,
  normalizedName?: string | null
) {
  const conditions = [];

  if (customerId) {
    conditions.push(eq(customers.id, parseInt(customerId)));
  }

  if (normalizedName) {
    conditions.push(eq(customers.normalizedName, normalizedName));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}
