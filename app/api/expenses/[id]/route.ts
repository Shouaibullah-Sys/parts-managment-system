// app/api/expenses/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { expenses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    if (isNaN(id)) {
      return Response.json(
        { success: false, error: "Invalid expense ID" },
        { status: 400 }
      );
    }

    const expenseData = await db.execute(sql`
      SELECT
        e.id,
        e.title,
        e.description,
        e.amount,
        e.category,
        e.expense_date AS "expenseDate",
        e.receipt_number AS "receiptNumber",
        e.vendor,
        e.created_by AS "createdBy",
        e.created_at AS "createdAt",
        e.updated_at AS "updatedAt"
      FROM expenses e
      WHERE e.id = ${id}
    `);

    const expense =
      expenseData.rows && expenseData.rows.length > 0
        ? expenseData.rows[0]
        : null;

    if (!expense) {
      return Response.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return Response.json(
      { success: false, error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    if (isNaN(id)) {
      return Response.json(
        { success: false, error: "Invalid expense ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      amount,
      category,
      expenseDate,
      receiptNumber,
      vendor,
    } = body;

    // Check if expense exists
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (existingExpense.length === 0) {
      return Response.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    // Update the expense
    const updatedExpense = await db
      .update(expenses)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
        ...(category !== undefined && { category }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(receiptNumber !== undefined && { receiptNumber }),
        ...(vendor !== undefined && { vendor }),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();

    return Response.json({
      success: true,
      data: updatedExpense[0],
      message: "Expense updated successfully",
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return Response.json(
      { success: false, error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    if (isNaN(id)) {
      return Response.json(
        { success: false, error: "Invalid expense ID" },
        { status: 400 }
      );
    }

    // Check if expense exists
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (existingExpense.length === 0) {
      return Response.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    // Delete the expense
    await db.delete(expenses).where(eq(expenses.id, id));

    return Response.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return Response.json(
      { success: false, error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
