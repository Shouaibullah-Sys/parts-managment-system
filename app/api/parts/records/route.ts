// app/api/parts/records/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { sales, customers, user, parts } from "@/db/schema";
import { desc, sql, eq, and, like, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const search = url.searchParams.get("search");

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          like(customers.name, `%${search}%`),
          like(customers.normalizedName, `%${search}%`),
          like(parts.name, `%${search}%`),
          like(parts.partNumber, `%${search}%`)
        )
      );
    }

    // Build the main query with proper joins including payment info
    const query = db
      .select({
        id: sales.id,
        customerName: customers.name,
        normalizedName: customers.normalizedName,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
        outstanding: sales.outstanding,
        isFullyPaid: sales.isFullyPaid,
        issueDate: sales.saleDate,
        quantity: sales.quantity,
        issuedBy: user.name,
        partNumber: parts.partNumber,
        partName: parts.name,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(user, eq(sales.createdBy, user.id))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(sales.saleDate))
      .limit(limit)
      .offset(offset);

    const records = await query;

    // Get total count with same conditions
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(user, eq(sales.createdBy, user.id))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Format the response with payment information
    const formattedRecords = records.map((record) => ({
      id: record.id,
      customerName: record.customerName || "نامشخص",
      normalizedName: record.normalizedName || "",
      totalAmount: record.totalAmount?.toString() || "0",
      paidAmount: record.paidAmount?.toString() || "0",
      outstanding: record.outstanding?.toString() || "0",
      isFullyPaid: record.isFullyPaid || false,
      issueDate: record.issueDate
        ? record.issueDate.toISOString()
        : new Date().toISOString(),
      quantity: record.quantity || 0,
      issuedBy: record.issuedBy || "نامشخص",
      partNumber: record.partNumber || "",
      partName: record.partName || "نامشخص",
      itemCount: 1,
      status: record.isFullyPaid
        ? ("completed" as const)
        : ("pending" as const),
    }));

    return ok(formattedRecords, {
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("Error in parts/records API:", err);
    return serverError(err);
  }
}
