import {
  DashboardStats,
  LowStockItem,
  SalesTrend,
  PaymentStatus,
  DateRange,
} from "@/types/dashboard";
import { subDays } from "date-fns";
import { db } from "@/db/drizzle";
import { sales, customers, parts, expenses } from "@/db/schema";
import { sql, and, gte, lte } from "drizzle-orm";
import { startOfToday, startOfMonth } from "date-fns";

// Type definitions for expense analytics
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

export const fetchDashboardStats = async (
  dateRange?: DateRange
): Promise<DashboardStats> => {
  try {
    // If we're in the browser, use HTTP request
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("from", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("to", dateRange.to.toISOString());
      }

      const response = await fetch(
        `/api/dashboard/stats?${params.toString()}`,
        {
          // Add caching headers to prevent excessive requests
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return await response.json();
    }

    // If we're on the server, use direct database queries
    // Note: This should only run in server-side contexts
    if (typeof window !== "undefined") {
      throw new Error(
        "Dashboard stats should be fetched via API routes on client side"
      );
    }

    const today = startOfToday();
    const monthStart = startOfMonth(new Date());

    // Get total sales, paid, outstanding
    const salesData = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(${sales.paidAmount}), 0)`,
        totalOutstanding: sql<number>`COALESCE(SUM(${sales.outstanding}), 0)`,
        todaySales: sql<number>`
          COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${today} THEN ${sales.totalAmount} ELSE 0 END), 0)
        `,
        monthlySales: sql<number>`
          COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart} THEN ${sales.totalAmount} ELSE 0 END), 0)
        `,
      })
      .from(sales);

    // Get total customers
    const customersData = await db
      .select({ totalCustomers: sql<number>`COUNT(*)` })
      .from(customers);

    // Get total parts
    const partsData = await db
      .select({ totalParts: sql<number>`COUNT(*)` })
      .from(parts);

    // Get low stock count using transaction-based calculation
    const lowStockData = await db.execute(sql`
      SELECT COUNT(*) as low_stock_count
      FROM parts p
      WHERE COALESCE((
        SELECT SUM(i.change)
        FROM inventory_transactions i
        WHERE i.part_id = p.id
      ), 0) < p.min_stock
    `);

    const stats = {
      totalSales: parseFloat(salesData[0]?.totalSales?.toString() || "0"),
      totalPaid: parseFloat(salesData[0]?.totalPaid?.toString() || "0"),
      totalOutstanding: parseFloat(
        salesData[0]?.totalOutstanding?.toString() || "0"
      ),
      todaySales: parseFloat(salesData[0]?.todaySales?.toString() || "0"),
      monthlySales: parseFloat(salesData[0]?.monthlySales?.toString() || "0"),
      totalCustomers: parseInt(
        customersData[0]?.totalCustomers?.toString() || "0"
      ),
      totalParts: parseInt(partsData[0]?.totalParts?.toString() || "0"),
      lowStockCount: parseInt(
        (lowStockData.rows[0] as any)?.low_stock_count || "0"
      ),
      paymentCompletionRate: salesData[0]?.totalSales
        ? (parseFloat(salesData[0].totalPaid.toString()) /
            parseFloat(salesData[0].totalSales.toString())) *
          100
        : 0,
    };

    return stats;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalSales: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalCustomers: 0,
      totalParts: 0,
      lowStockCount: 0,
      todaySales: 0,
      monthlySales: 0,
      paymentCompletionRate: 0,
    };
  }
};

export const fetchLowStockItems = async (): Promise<LowStockItem[]> => {
  try {
    // If we're in the browser, use HTTP request
    if (typeof window !== "undefined") {
      const response = await fetch(`/api/parts?limit=1000`);
      if (!response.ok) throw new Error("Failed to fetch parts data");

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lowStockItems = result.data.filter((part: any) => {
        const currentStock = part.current_stock || part.currentStock || 0;
        const minStock = part.min_stock || part.minStock || 0;
        return currentStock < minStock && part.active !== false;
      });

      return lowStockItems.map((part: any) => ({
        id: part.id,
        part_number: part.part_number || part.partNumber,
        name: part.name,
        min_stock: part.min_stock || part.minStock || 0,
        current_stock: part.current_stock || part.currentStock || 0,
        section: part.section || "E",
        cost_price: part.cost_price || part.costPrice || "0",
        sale_price: part.sale_price || part.salePrice || "0",
      }));
    }

    // If we're on the server, use direct database queries
    const lowStockData = await db.execute(sql`
      SELECT 
        p.id,
        p.part_number,
        p.name,
        p.min_stock,
        p.section,
        p.cost_price,
        p.sale_price,
        COALESCE(SUM(i.change), 0) as current_stock
      FROM parts p
      LEFT JOIN inventory_transactions i ON p.id = i.part_id
      WHERE p.active != false
      GROUP BY p.id, p.part_number, p.name, p.min_stock, p.section, p.cost_price, p.sale_price
      HAVING COALESCE(SUM(i.change), 0) < p.min_stock
      ORDER BY current_stock ASC
      LIMIT 100
    `);

    return (lowStockData.rows as any[]).map((part) => ({
      id: part.id,
      part_number: part.part_number,
      name: part.name,
      min_stock: part.min_stock || 0,
      current_stock: parseFloat(part.current_stock?.toString() || "0"),
      section: part.section || "E",
      cost_price: part.cost_price?.toString() || "0",
      sale_price: part.sale_price?.toString() || "0",
    }));
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    return [];
  }
};

export const fetchSalesTrend = async (
  dateRange?: DateRange
): Promise<SalesTrend[]> => {
  try {
    // If we're in the browser, use HTTP request
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (!dateRange?.from) {
        dateRange = {
          from: subDays(new Date(), 7),
          to: new Date(),
        };
      }
      if (dateRange.from) {
        params.append("from", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append("to", dateRange.to.toISOString());
      }

      const response = await fetch(
        `/api/dashboard/sales-trend?${params.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch sales trend: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }

    // If we're on the server, use direct database queries
    if (!dateRange?.from) {
      dateRange = {
        from: subDays(new Date(), 7),
        to: new Date(),
      };
    }

    // Build the query with proper date filtering
    let query = sql`
      SELECT 
        DATE(s.sale_date) as date,
        COALESCE(SUM(s.total_amount), 0) as sales,
        COALESCE(SUM(p.amount), 0) as payments
      FROM sales s
      LEFT JOIN payments p ON p.sale_id = s.id AND DATE(p.payment_date) = DATE(s.sale_date)
    `;

    // Add WHERE clause based on date parameters
    if (dateRange.from && dateRange.to) {
      query = query.append(
        sql` WHERE s.sale_date >= ${dateRange.from.toISOString()} AND s.sale_date <= ${dateRange.to.toISOString()}`
      );
    } else if (dateRange.from) {
      query = query.append(
        sql` WHERE s.sale_date >= ${dateRange.from.toISOString()}`
      );
    } else if (dateRange.to) {
      query = query.append(
        sql` WHERE s.sale_date <= ${dateRange.to.toISOString()}`
      );
    } else {
      // Default to last 7 days if no date range provided
      query = query.append(
        sql` WHERE s.sale_date >= CURRENT_DATE - INTERVAL '7 days'`
      );
    }

    // Complete the query
    query = query.append(sql`
      GROUP BY DATE(s.sale_date)
      ORDER BY date ASC
    `);

    // Execute the query
    const trendData = await db.execute(query);

    // Format the data
    const formattedData = (trendData.rows as any[]).map((row) => ({
      date: row.date,
      sales: parseFloat(row.sales) || 0,
      payments: parseFloat(row.payments) || 0,
    }));

    return formattedData;
  } catch (error) {
    console.error("Error in fetchSalesTrend:", error);
    return [];
  }
};

export const fetchPaymentStatus = async (
  dateRange?: DateRange
): Promise<PaymentStatus> => {
  try {
    // If we're in the browser, use HTTP request
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("from", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("to", dateRange.to.toISOString());
      }

      const response = await fetch(
        `/api/dashboard/payment-status?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch payment status");
      return await response.json();
    }

    // If we're on the server, use direct database queries
    let query = sql`
      SELECT 
        COUNT(CASE WHEN is_fully_paid = true THEN 1 END) as fully_paid,
        COUNT(CASE WHEN is_fully_paid = false AND outstanding < total_amount AND outstanding > 0 THEN 1 END) as partially_paid,
        COUNT(CASE WHEN is_fully_paid = false AND outstanding = total_amount THEN 1 END) as not_paid
      FROM sales
    `;

    // Add WHERE clause based on date parameters
    if (dateRange?.from && dateRange?.to) {
      query = query.append(
        sql` WHERE sale_date >= ${dateRange.from.toISOString()} AND sale_date <= ${dateRange.to.toISOString()}`
      );
    } else if (dateRange?.from) {
      query = query.append(
        sql` WHERE sale_date >= ${dateRange.from.toISOString()}`
      );
    } else if (dateRange?.to) {
      query = query.append(
        sql` WHERE sale_date <= ${dateRange.to.toISOString()}`
      );
    }

    const paymentData = await db.execute(query);
    const rows = paymentData.rows as any[];
    const status = {
      fullyPaid: parseInt(rows[0]?.fully_paid || "0"),
      partiallyPaid: parseInt(rows[0]?.partially_paid || "0"),
      notPaid: parseInt(rows[0]?.not_paid || "0"),
    };

    return status;
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return {
      fullyPaid: 0,
      partiallyPaid: 0,
      notPaid: 0,
    };
  }
};

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

export const fetchExpenseReports = async (
  dateRange?: DateRange
): Promise<ExpenseAnalytics> => {
  try {
    // If we're in the browser, use HTTP request
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("from", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("to", dateRange.to.toISOString());
      }

      const response = await fetch(
        `/api/dashboard/expense-reports?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch expense reports");
      return await response.json();
    }

    // If we're on the server, use direct database queries
    if (!dateRange?.from || !dateRange?.to) {
      throw new Error("Date range is required for server-side expense reports");
    }

    // Helper functions for date calculations
    function getStartOfWeek(date: Date): Date {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    }

    function getStartOfMonth(date: Date): Date {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }

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
    const netProfit = grossProfit;

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

    return analytics;
  } catch (error) {
    console.error("Error fetching expense reports:", error);
    return {
      totalExpenses: 0,
      totalCategories: 0,
      averageExpense: 0,
      topCategory: "",
      categoryBreakdown: [],
      expenseTrend: [],
      dailyExpensePattern: [],
      expenseByVendor: [],
      weeklyComparison: {
        currentWeek: 0,
        previousWeek: 0,
        percentageChange: 0,
      },
      monthlyComparison: {
        currentMonth: 0,
        previousMonth: 0,
        percentageChange: 0,
      },
      profitAnalysis: {
        totalRevenue: 0,
        totalExpenses: 0,
        grossProfit: 0,
        profitMargin: 0,
        netProfit: 0,
      },
    };
  }
};
