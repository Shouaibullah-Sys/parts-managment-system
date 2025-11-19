// app/api/dashboard/expense-reports/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { expenses, sales } from "@/db/schema";
import { sql, and, gte, lte } from "drizzle-orm";

interface DateRange {
  from: Date;
  to: Date;
}

interface ExpenseCategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface ExpenseTrendData {
  date: string;
  amount: number;
  count: number;
}

interface ExpenseAnalytics {
  totalExpenses: number;
  totalCategories: number;
  averageExpense: number;
  topCategory: string;
  categoryBreakdown: ExpenseCategoryData[];
  expenseTrend: ExpenseTrendData[];
  dailyExpensePattern: {
    day: string;
    amount: number;
  }[];
  expenseByVendor: {
    vendor: string;
    amount: number;
    count: number;
  }[];
  weeklyComparison: {
    currentWeek: number;
    previousWeek: number;
    percentageChange: number;
  };
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    percentageChange: number;
  };
  profitAnalysis: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    profitMargin: number;
    netProfit: number;
  };
}

// Helper function to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper function to get start of week (Monday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper function to get start of month
function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function GET(req: Request) {
  try {
    // Log only in non-browser environments to prevent stdout errors
    if (typeof window === "undefined") {
      console.log("Expense reports API called");
    }
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: "Date range is required" },
        { status: 400 }
      );
    }

    const dateRange: DateRange = {
      from: new Date(from),
      to: new Date(to),
    };

    // Calculate comparisons
    const currentWeekStart = getStartOfWeek(dateRange.from);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

    const currentMonthStart = getStartOfMonth(dateRange.from);
    const previousMonthStart = new Date(currentMonthStart);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    const previousMonthEnd = new Date(currentMonthStart);
    previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);

    // Get expense analytics
    const [
      totalExpenseResult,
      categoryResults,
      trendResults,
      vendorResults,
      currentWeekExpenses,
      previousWeekExpenses,
      currentMonthExpenses,
      previousMonthExpenses,
      profitData,
    ] = await Promise.all([
      // Total expenses and categories
      db
        .select({
          total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
          count: sql<number>`count(*)`,
          categories: sql<number>`count(distinct ${expenses.category})`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, dateRange.from),
            lte(expenses.expenseDate, dateRange.to)
          )
        ),

      // Category breakdown
      db
        .select({
          category: expenses.category,
          amount: sql<number>`sum(${expenses.amount})`,
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, dateRange.from),
            lte(expenses.expenseDate, dateRange.to)
          )
        )
        .groupBy(expenses.category)
        .orderBy(sql`sum(${expenses.amount}) DESC`),

      // Daily expense trend
      db
        .select({
          date: sql<string>`DATE(${expenses.expenseDate})`,
          amount: sql<number>`sum(${expenses.amount})`,
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, dateRange.from),
            lte(expenses.expenseDate, dateRange.to)
          )
        )
        .groupBy(sql`DATE(${expenses.expenseDate})`)
        .orderBy(sql`DATE(${expenses.expenseDate})`),

      // Expenses by vendor
      db
        .select({
          vendor: expenses.vendor,
          amount: sql<number>`sum(${expenses.amount})`,
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, dateRange.from),
            lte(expenses.expenseDate, dateRange.to),
            sql`${expenses.vendor} IS NOT NULL`
          )
        )
        .groupBy(expenses.vendor)
        .orderBy(sql`sum(${expenses.amount}) DESC`)
        .limit(10),

      // Current week expenses
      db
        .select({
          total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, currentWeekStart),
            lte(expenses.expenseDate, dateRange.to)
          )
        ),

      // Previous week expenses
      db
        .select({
          total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, previousWeekStart),
            lte(expenses.expenseDate, previousWeekEnd)
          )
        ),

      // Current month expenses
      db
        .select({
          total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, currentMonthStart),
            lte(expenses.expenseDate, dateRange.to)
          )
        ),

      // Previous month expenses
      db
        .select({
          total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, previousMonthStart),
            lte(expenses.expenseDate, previousMonthEnd)
          )
        ),

      // Profit analysis - get revenue from sales
      db
        .select({
          totalRevenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
          totalPaid: sql<number>`coalesce(sum(${sales.paidAmount}), 0)`,
        })
        .from(sales)
        .where(
          and(
            gte(sales.saleDate, dateRange.from),
            lte(sales.saleDate, dateRange.to)
          )
        ),
    ]);

    // Get total expenses
    const totalExpense = totalExpenseResult[0]?.total || 0;
    const totalExpenseCount = totalExpenseResult[0]?.count || 0;
    const totalCategories = totalExpenseResult[0]?.categories || 0;

    // Calculate category percentages
    const categoryBreakdown: ExpenseCategoryData[] = categoryResults.map(
      (cat) => ({
        category: cat.category || "نامشخص",
        amount: Number(cat.amount) || 0,
        count: Number(cat.count) || 0,
        percentage:
          totalExpense > 0
            ? ((Number(cat.amount) || 0) / totalExpense) * 100
            : 0,
      })
    );

    // Calculate day of week pattern (last 4 weeks)
    const dayNames = [
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنج‌شنبه",
      "جمعه",
      "شنبه",
    ];
    const dailyPattern = await db
      .select({
        dayOfWeek: sql<number>`extract(dow from ${expenses.expenseDate})`,
        amount: sql<number>`sum(${expenses.amount})`,
      })
      .from(expenses)
      .where(
        and(
          gte(
            expenses.expenseDate,
            new Date(dateRange.to.getTime() - 28 * 24 * 60 * 60 * 1000)
          ),
          lte(expenses.expenseDate, dateRange.to)
        )
      )
      .groupBy(sql`extract(dow from ${expenses.expenseDate})`);

    const expenseByDayOfWeek = dayNames.map((day, index) => {
      const dayData = dailyPattern.find((d) => d.dayOfWeek === index);
      return {
        day,
        amount: Number(dayData?.amount) || 0,
      };
    });

    // Calculate weekly and monthly comparisons
    const currentWeekTotal = currentWeekExpenses[0]?.total || 0;
    const previousWeekTotal = previousWeekExpenses[0]?.total || 0;
    const weeklyChange =
      previousWeekTotal > 0
        ? ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100
        : 0;

    const currentMonthTotal = currentMonthExpenses[0]?.total || 0;
    const previousMonthTotal = previousMonthExpenses[0]?.total || 0;
    const monthlyChange =
      previousMonthTotal > 0
        ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : 0;

    // Calculate profit analysis
    const totalRevenue = Number(profitData[0]?.totalRevenue) || 0;
    const grossProfit = totalRevenue - totalExpense;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit; // For now, assuming no other deductions

    // Get top category
    const topCategory =
      categoryBreakdown.length > 0 ? categoryBreakdown[0].category : "نامشخص";

    const analytics: ExpenseAnalytics = {
      totalExpenses: totalExpense,
      totalCategories,
      averageExpense:
        totalExpenseCount > 0 ? totalExpense / totalExpenseCount : 0,
      topCategory,
      categoryBreakdown,
      expenseTrend: trendResults.map((item) => ({
        date: item.date,
        amount: Number(item.amount) || 0,
        count: Number(item.count) || 0,
      })),
      dailyExpensePattern: expenseByDayOfWeek,
      expenseByVendor: vendorResults.map((item) => ({
        vendor: item.vendor || "نامشخص",
        amount: Number(item.amount) || 0,
        count: Number(item.count) || 0,
      })),
      weeklyComparison: {
        currentWeek: currentWeekTotal,
        previousWeek: previousWeekTotal,
        percentageChange: weeklyChange,
      },
      monthlyComparison: {
        currentMonth: currentMonthTotal,
        previousMonth: previousMonthTotal,
        percentageChange: monthlyChange,
      },
      profitAnalysis: {
        totalRevenue,
        totalExpenses: totalExpense,
        grossProfit,
        profitMargin,
        netProfit,
      },
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error in expense reports API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expense reports" },
      { status: 500 }
    );
  }
}
