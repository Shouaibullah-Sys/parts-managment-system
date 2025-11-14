// app/api/issue-records/route.ts
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
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const search = url.searchParams.get("search");

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (search) {
      whereConditions.push(like(customers.name, `%${search}%`));
    }

    // Build the main query with proper joins
    const query = db
      .select({
        id: sales.id,
        customerName: customers.name,
        totalAmount: sales.totalAmount,
        issueDate: sales.saleDate,
        quantity: sales.quantity,
        issuedBy: user.name,
        partNumber: parts.partNumber,
        partName: parts.name,
      })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
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
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(user, eq(sales.createdBy, user.id))
      .leftJoin(parts, eq(sales.partId, parts.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Format the response
    const formattedRecords = records.map((record) => ({
      ...record,
      totalAmount: record.totalAmount?.toString() || "0",
      itemCount: 1,
      status: "completed" as const,
    }));

    return ok(formattedRecords, {
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("Error in issue-records API:", err);
    return serverError(err);
  }
}
