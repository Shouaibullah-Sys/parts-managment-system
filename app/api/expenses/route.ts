// app/api/expenses/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { expenses, user } from "@/db/schema";
import { eq, and, or, like, sql, count, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    // Search filter
    if (search) {
      const searchCondition = sql`
        (${expenses.title} ILIKE ${`%${search}%`} OR 
         ${expenses.description} ILIKE ${`%${search}%`} OR 
         ${expenses.vendor} ILIKE ${`%${search}%`})
      `;
      whereConditions.push(searchCondition);
    }

    // Category filter
    if (category) {
      whereConditions.push(eq(expenses.category, category));
    }

    // Date range filter
    if (startDate && endDate) {
      whereConditions.push(
        and(
          sql`${expenses.expenseDate} >= ${startDate}::timestamp`,
          sql`${expenses.expenseDate} <= ${endDate}::timestamp`
        )
      );
    }

    // Build the main query
    const expensesQuery = db
      .select({
        id: expenses.id,
        title: expenses.title,
        description: expenses.description,
        amount: expenses.amount,
        category: expenses.category,
        expenseDate: expenses.expenseDate,
        receiptNumber: expenses.receiptNumber,
        vendor: expenses.vendor,
        createdBy: expenses.createdBy,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

    // Get total count
    const totalCountQuery = db
      .select({ count: count() })
      .from(expenses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Get total amount
    const totalAmountQuery = db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Execute all queries
    const [expensesData, totalCountResult, totalAmountResult] =
      await Promise.all([expensesQuery, totalCountQuery, totalAmountQuery]);

    const total = totalCountResult.length > 0 ? totalCountResult[0].count : 0;
    const totalAmount =
      totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: expensesData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary: {
        totalAmount,
        totalExpenses: total,
      },
    });
  } catch (error) {
    console.error("Error in expenses API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      title,
      description,
      amount,
      category,
      expenseDate,
      receiptNumber,
      vendor,
      createdBy,
    } = body;

    if (!title || !amount || !category) {
      return NextResponse.json(
        { success: false, error: "Title, amount, and category are required" },
        { status: 400 }
      );
    }

    // Insert the new expense
    const newExpense = await db
      .insert(expenses)
      .values({
        title,
        description: description || null,
        amount: amount.toString(),
        category,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        receiptNumber: receiptNumber || null,
        vendor: vendor || null,
        createdBy: createdBy || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newExpense[0],
      message: "Expense created successfully",
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
