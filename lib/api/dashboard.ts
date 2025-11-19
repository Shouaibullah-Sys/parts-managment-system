import {
  DashboardStats,
  LowStockItem,
  SalesTrend,
  PaymentStatus,
  DateRange,
} from "@/types/dashboard";
import { subDays } from "date-fns"; // Add this import

export const fetchDashboardStats = async (
  dateRange?: DateRange
): Promise<DashboardStats> => {
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("from", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    params.append("to", dateRange.to.toISOString());
  }

  try {
    // Use absolute URL to avoid parsing issues
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const response = await fetch(
      `${baseUrl}/api/dashboard/stats?${params.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");
    return await response.json();
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
  // Use absolute URL to avoid parsing issues
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/parts?limit=1000`);
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
};

export const fetchSalesTrend = async (
  dateRange?: DateRange
): Promise<SalesTrend[]> => {
  const params = new URLSearchParams();

  if (!dateRange?.from) {
    dateRange = {
      from: subDays(new Date(), 7), // Now this will work
      to: new Date(),
    };
  }

  if (dateRange.from) {
    params.append("from", dateRange.from.toISOString());
  }
  if (dateRange.to) {
    params.append("to", dateRange.to.toISOString());
  }

  try {
    // Use absolute URL to avoid parsing issues
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const response = await fetch(
      `${baseUrl}/api/dashboard/sales-trend?${params.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch sales trend: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error in fetchSalesTrend:", error);
    return [];
  }
};

export const fetchPaymentStatus = async (
  dateRange?: DateRange
): Promise<PaymentStatus> => {
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("from", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    params.append("to", dateRange.to.toISOString());
  }

  // Use absolute URL to avoid parsing issues
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const response = await fetch(
    `${baseUrl}/api/dashboard/payment-status?${params.toString()}`
  );
  if (!response.ok) throw new Error("Failed to fetch payment status");
  return response.json();
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
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("from", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    params.append("to", dateRange.to.toISOString());
  }

  try {
    // Use absolute URL to avoid parsing issues
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const response = await fetch(
      `${baseUrl}/api/dashboard/expense-reports?${params.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch expense reports");
    return await response.json();
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
