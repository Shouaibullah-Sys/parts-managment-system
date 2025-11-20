// app/dashboard/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Loader from "@/components/loader";
import {
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  Calendar as CalendarIcon,
  BarChart3,
  PackageSearch,
  Eye,
  ChevronLeft,
  ChevronRight,
  Receipt,
  TrendingDown,
  Calculator,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  format,
  startOfToday,
  startOfWeek,
  startOfMonth,
  subDays,
  isSameDay,
  isSameWeek,
  isSameMonth,
  differenceInDays,
} from "date-fns";
import { faIR } from "date-fns/locale";

// Types
interface DashboardStats {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  totalCustomers: number;
  totalParts: number;
  lowStockCount: number;
  todaySales: number;
  monthlySales: number;
  paymentCompletionRate: number;
}

interface LowStockItem {
  id: number;
  part_number: string;
  name: string;
  min_stock: number;
  current_stock: number;
  section: string;
  cost_price: string;
  sale_price: string;
}

interface SalesTrend {
  date: string;
  sales: number;
  payments: number;
}

interface PaymentStatus {
  fullyPaid: number;
  partiallyPaid: number;
  notPaid: number;
}

interface ExpenseData {
  totalExpenses: number;
  totalCategories: number;
  averageExpense: number;
  topCategory: string;
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  expenseTrend: {
    date: string;
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

interface DateRange {
  from: Date;
  to: Date;
}

// API functions - Updated to include date range
// Updated API functions with better error handling
const fetchDashboardStats = async (
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
    const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");
    return await response.json();
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Return default stats to prevent UI breaking
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
const fetchLowStockItems = async (): Promise<LowStockItem[]> => {
  const response = await fetch("/api/parts?limit=1000");
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

const fetchSalesTrend = async (
  dateRange?: DateRange
): Promise<SalesTrend[]> => {
  const params = new URLSearchParams();

  // If no date range provided, default to last 7 days
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

  try {
    console.log("🔄 Frontend: Calling sales-trend API with:", {
      url: `/api/dashboard/sales-trend?${params.toString()}`,
      dateRange,
      fromISO: dateRange.from?.toISOString(),
      toISO: dateRange.to?.toISOString(),
    });

    const response = await fetch(
      `/api/dashboard/sales-trend?${params.toString()}`
    );

    console.log("📡 Frontend: API Response status:", response.status);
    console.log(
      "📡 Frontend: API Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Frontend: API Error:", errorText);
      throw new Error(
        `Failed to fetch sales trend: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("✅ Frontend: API Response data:", data);

    // Ensure we return an array even if API returns null/undefined
    const result = Array.isArray(data) ? data : [];
    console.log("📊 Frontend: Final processed data:", result);
    return result;
  } catch (error) {
    console.error("❌ Frontend: Error in fetchSalesTrend:", error);
    return [];
  }
};

const fetchPaymentStatus = async (
  dateRange?: DateRange
): Promise<PaymentStatus> => {
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
  return response.json();
};

const fetchExpenseData = async (
  dateRange?: DateRange
): Promise<ExpenseData> => {
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("from", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    params.append("to", dateRange.to.toISOString());
  }

  try {
    const response = await fetch(
      `/api/dashboard/expense-reports?${params.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch expense data");
    return await response.json();
  } catch (error) {
    console.error("Error fetching expense data:", error);
    // Return default expense data to prevent UI breaking
    return {
      totalExpenses: 0,
      totalCategories: 0,
      averageExpense: 0,
      topCategory: "نامشخص",
      categoryBreakdown: [],
      expenseTrend: [],
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

// Date Range Picker Component - Fixed for mobile
const DateRangePicker = ({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const quickFilters = [
    {
      label: "امروز",
      value: "today",
      getRange: () => ({
        from: startOfToday(),
        to: startOfToday(),
      }),
    },
    {
      label: "این هفته",
      value: "thisWeek",
      getRange: () => ({
        from: startOfWeek(new Date(), { locale: faIR }),
        to: new Date(),
      }),
    },
    {
      label: "این ماه",
      value: "thisMonth",
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: new Date(),
      }),
    },
    {
      label: "همه زمانها",
      value: "lifetime",
      getRange: () => ({
        from: new Date(2020, 0, 1),
        to: new Date(),
      }),
    },
  ];

  const handleQuickFilter = (filter: (typeof quickFilters)[0]) => {
    onDateRangeChange(filter.getRange());
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[280px] lg:w-[320px] justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "yyyy/MM/dd", { locale: faIR })} -{" "}
                {format(dateRange.to, "yyyy/MM/dd", { locale: faIR })}
              </>
            ) : (
              format(dateRange.from, "yyyy/MM/dd", { locale: faIR })
            )
          ) : (
            <span>انتخاب تاریخ</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={5}>
        <div className="flex flex-col p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickFilters.map((filter) => (
              <Button
                key={filter.value}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter)}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="overflow-auto">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                  setIsOpen(false);
                }
              }}
              numberOfMonths={1}
              locale={faIR}
              className="rounded-md border"
            />
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              لغو
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              تأیید
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Helper function to get dynamic sales title and date range text
const getSalesCardInfo = (dateRange: DateRange) => {
  const today = startOfToday();
  const weekStart = startOfWeek(new Date(), { locale: faIR });
  const monthStart = startOfMonth(new Date());
  const lifetimeStart = new Date(2020, 0, 1);

  // Check if it's today
  if (isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today)) {
    return {
      title: "فروش امروز",
      dateText: format(today, "yyyy/MM/dd", { locale: faIR }),
    };
  }

  // Check if it's this week
  if (
    isSameDay(dateRange.from, weekStart) &&
    isSameDay(dateRange.to, today) &&
    isSameWeek(dateRange.from, dateRange.to, { locale: faIR })
  ) {
    return {
      title: "فروش این هفته",
      dateText: "این هفته",
    };
  }

  // Check if it's this month
  if (
    isSameDay(dateRange.from, monthStart) &&
    isSameDay(dateRange.to, today) &&
    isSameMonth(dateRange.from, dateRange.to)
  ) {
    return {
      title: "فروش این ماه",
      dateText: "این ماه",
    };
  }

  // Check if it's lifetime
  if (
    isSameDay(dateRange.from, lifetimeStart) &&
    isSameDay(dateRange.to, today)
  ) {
    return {
      title: "فروش کل",
      dateText: "همه زمانها",
    };
  }

  // Check if it's a custom single day
  if (isSameDay(dateRange.from, dateRange.to)) {
    return {
      title: "فروش روز",
      dateText: format(dateRange.from, "yyyy/MM/dd", { locale: faIR }),
    };
  }

  // Check if it's a custom range (less than 7 days)
  const dayDifference = differenceInDays(dateRange.to, dateRange.from);
  if (dayDifference <= 7) {
    return {
      title: `فروش ${dayDifference} روزه`,
      dateText: `${format(dateRange.from, "yyyy/MM/dd", { locale: faIR })} - ${format(dateRange.to, "yyyy/MM/dd", { locale: faIR })}`,
    };
  }

  // Default custom range
  return {
    title: "فروش در بازه انتخابی",
    dateText: `${format(dateRange.from, "yyyy/MM/dd", { locale: faIR })} - ${format(dateRange.to, "yyyy/MM/dd", { locale: faIR })}`,
  };
};

// Enhanced Chart components with better visualization
const SalesTrendChart = ({ data }: { data: SalesTrend[] }) => {
  // Filter out any invalid data and ensure we have sales data
  const validData =
    data?.filter((item) => item && item.date && item.sales !== undefined) || [];

  console.log("📈 Chart Component - Raw data:", data);
  console.log("📈 Chart Component - Valid data:", validData);

  if (validData.length === 0) {
    console.log("📈 Chart Component - No valid data, showing empty state");
    return (
      <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
        <p>داده‌ای برای نمایش وجود ندارد</p>
        <p className="text-xs mt-1">اطلاعات فروش در بازه انتخاب شده یافت نشد</p>
      </div>
    );
  }

  const maxSales = Math.max(...validData.map((item) => item.sales), 1);
  const maxPayments = Math.max(...validData.map((item) => item.payments), 1);
  const maxValue = Math.max(maxSales, maxPayments);

  console.log("📈 Chart Component - Max sales:", maxSales);
  console.log("📈 Chart Component - Max payments:", maxPayments);
  console.log("📈 Chart Component - Max value:", maxValue);

  return (
    <div className="w-full h-48 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 pt-8 px-2 relative">
      {/* Chart Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0.2, 0.4, 0.6, 0.8, 1].map((line, index) => (
          <div
            key={index}
            className="border-t border-gray-200 dark:border-gray-700 w-full"
          />
        ))}
      </div>

      {validData.map((item, index) => (
        <div
          key={`${item.date}-${index}`}
          className="flex flex-col items-center flex-1 z-10"
        >
          {/* Date Label - Always visible on mobile */}
          <div className="text-xs text-muted-foreground mb-2">
            {format(new Date(item.date), "dd/MM", { locale: faIR })}
          </div>

          {/* Bars Container */}
          <div className="flex items-end gap-1 w-full h-32 justify-center">
            {/* Sales Bar */}
            <div
              className="bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600 min-h-0.5 relative group"
              style={{
                height: `${Math.max((item.sales / maxValue) * 80, 2)}%`,
                width: "24px",
              }}
              title={`فروش: ${item.sales.toLocaleString("fa-IR")} افغانی`}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.sales.toLocaleString("fa-IR")}
              </div>
            </div>

            {/* Payments Bar */}
            <div
              className="bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600 min-h-0.5 relative group"
              style={{
                height: `${Math.max((item.payments / maxValue) * 80, 2)}%`,
                width: "24px",
              }}
              title={`پرداختی: ${item.payments.toLocaleString("fa-IR")} افغانی`}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.payments.toLocaleString("fa-IR")}
              </div>
            </div>
          </div>

          {/* Data Values Below */}
          <div className="mt-1 text-xs text-center">
            <div className="text-blue-600 font-medium">
              {item.sales > 0 ? item.sales.toLocaleString("fa-IR") : "0"}
            </div>
            <div className="text-green-600 font-medium">
              {item.payments > 0 ? item.payments.toLocaleString("fa-IR") : "0"}
            </div>
          </div>
        </div>
      ))}

      {/* Y-axis Labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
        <span>{maxValue.toLocaleString("fa-IR")}</span>
        <span>{(maxValue * 0.75).toLocaleString("fa-IR")}</span>
        <span>{(maxValue * 0.5).toLocaleString("fa-IR")}</span>
        <span>{(maxValue * 0.25).toLocaleString("fa-IR")}</span>
        <span>0</span>
      </div>
    </div>
  );
};
const PaymentStatusChart = ({ data }: { data: PaymentStatus }) => {
  const total = data.fullyPaid + data.partiallyPaid + data.notPaid;
  if (total === 0)
    return (
      <div className="text-center text-muted-foreground">
        داده‌ای موجود نیست
      </div>
    );

  return (
    <div className="w-full h-48 flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 sm:w-32 sm:h-32">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold">
              {total.toLocaleString("fa-IR")}
            </div>
            <div className="text-xs text-muted-foreground">مجموع</div>
          </div>
        </div>
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#22c55e"
            strokeWidth="20"
            strokeDasharray={`${(data.fullyPaid / total) * 251.2} 251.2`}
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#f59e0b"
            strokeWidth="20"
            strokeDasharray={`${(data.partiallyPaid / total) * 251.2} 251.2`}
            strokeDashoffset={-(data.fullyPaid / total) * 251.2}
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#ef4444"
            strokeWidth="20"
            strokeDasharray={`${(data.notPaid / total) * 251.2} 251.2`}
            strokeDashoffset={
              -((data.fullyPaid + data.partiallyPaid) / total) * 251.2
            }
            fill="none"
          />
        </svg>
      </div>
      <div className="mt-4 space-y-2 w-full px-2">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded"></div>
            <span>پرداخت کامل</span>
          </div>
          <span className="font-medium">
            {data.fullyPaid.toLocaleString("fa-IR")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded"></div>
            <span>پرداخت جزئی</span>
          </div>
          <span className="font-medium">
            {data.partiallyPaid.toLocaleString("fa-IR")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded"></div>
            <span>پرداخت نشده</span>
          </div>
          <span className="font-medium">
            {data.notPaid.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>
    </div>
  );
};

// Import the ExpenseCategoryChart component
import { ExpenseCategoryChart } from "./components/ExpenseCategoryChart";

const ExpenseChart = ({ data }: { data: ExpenseData }) => {
  if (!data || data.expenseTrend.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Receipt className="h-12 w-12 mb-2 opacity-50" />
        <p>اطلاعات مصارف موجود نیست</p>
        <p className="text-xs mt-1">مصارف در بازه انتخاب شده یافت نشد</p>
      </div>
    );
  }

  const maxExpense = Math.max(
    ...data.expenseTrend.map((item) => item.amount),
    1
  );

  return (
    <div className="w-full h-48 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 pt-8 px-2 relative">
      {/* Chart Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0.2, 0.4, 0.6, 0.8, 1].map((line, index) => (
          <div
            key={index}
            className="border-t border-gray-200 dark:border-gray-700 w-full"
          />
        ))}
      </div>

      {data.expenseTrend.map((item, index) => (
        <div
          key={`${item.date}-${index}`}
          className="flex flex-col items-center flex-1 z-10"
        >
          {/* Date Label - Always visible on mobile */}
          <div className="text-xs text-muted-foreground mb-2">
            {format(new Date(item.date), "dd/MM", { locale: faIR })}
          </div>

          {/* Expense Bar */}
          <div
            className="bg-red-500 rounded-t transition-all duration-500 hover:bg-red-600 min-h-0.5 relative group"
            style={{
              height: `${Math.max((item.amount / maxExpense) * 80, 2)}%`,
              width: "24px",
            }}
            title={`مصرف: ${item.amount.toLocaleString("fa-IR")} افغانی`}
          >
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {item.amount.toLocaleString("fa-IR")}
            </div>
          </div>

          {/* Data Value Below */}
          <div className="mt-1 text-xs text-center text-red-600 font-medium">
            {item.amount > 0 ? item.amount.toLocaleString("fa-IR") : "0"}
          </div>
        </div>
      ))}

      {/* Y-axis Labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
        <span>{maxExpense.toLocaleString("fa-IR")}</span>
        <span>{(maxExpense * 0.75).toLocaleString("fa-IR")}</span>
        <span>{(maxExpense * 0.5).toLocaleString("fa-IR")}</span>
        <span>{(maxExpense * 0.25).toLocaleString("fa-IR")}</span>
        <span>0</span>
      </div>
    </div>
  );
};

// Mobile-friendly table component
const MobileLowStockTable = ({ items }: { items: LowStockItem[] }) => {
  return (
    <div className="space-y-3 sm:hidden">
      {items.map((item) => {
        const deficit = item.min_stock - item.current_stock;
        return (
          <Card key={item.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.part_number}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.section}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">حداقل:</span>
                  <p>{item.min_stock.toLocaleString("fa-IR")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">موجودی:</span>
                  <p
                    className={
                      item.current_stock === 0
                        ? "text-red-600 font-bold"
                        : item.current_stock < item.min_stock / 2
                          ? "text-orange-600 font-medium"
                          : "text-amber-600"
                    }
                  >
                    {item.current_stock.toLocaleString("fa-IR")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">کمبود:</span>
                  <p className="text-red-600 font-medium">
                    -{deficit.toLocaleString("fa-IR")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">وضعیت:</span>
                  <Badge
                    variant={
                      item.current_stock === 0 ? "destructive" : "outline"
                    }
                    className={
                      item.current_stock === 0
                        ? "bg-red-600 text-xs"
                        : item.current_stock < item.min_stock / 2
                          ? "border-orange-600 text-orange-600 bg-orange-50 text-xs"
                          : "border-amber-600 text-amber-600 bg-amber-50 text-xs"
                    }
                  >
                    {item.current_stock === 0
                      ? "تمام شده"
                      : item.current_stock < item.min_stock / 2
                        ? "بحرانی"
                        : "موجودی کم"}
                  </Badge>
                </div>
              </div>

              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href={`/parts/${item.id}`}>
                  <Eye className="h-4 w-4 ml-1" />
                  مشاهده جزئیات
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default function AdminDashboard() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get dynamic sales card info based on date range
  const salesCardInfo = getSalesCardInfo(dateRange);

  // Queries with date range
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats", dateRange],
    queryFn: () => fetchDashboardStats(dateRange),
    refetchInterval: 30000,
  });

  const {
    data: lowStockItems,
    isLoading: lowStockLoading,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: fetchLowStockItems,
  });

  const {
    data: salesTrend,
    isLoading: trendLoading,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ["sales-trend", dateRange],
    queryFn: () => fetchSalesTrend(dateRange),
  });

  const {
    data: paymentStatus,
    isLoading: paymentLoading,
    refetch: refetchPayment,
  } = useQuery({
    queryKey: ["payment-status", dateRange],
    queryFn: () => fetchPaymentStatus(dateRange),
  });

  const {
    data: expenseData,
    isLoading: expenseLoading,
    refetch: refetchExpense,
  } = useQuery({
    queryKey: ["expense-data", dateRange],
    queryFn: () => fetchExpenseData(dateRange),
  });

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchLowStock(),
        refetchTrend(),
        refetchPayment(),
        refetchExpense(),
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate low stock count from the actual data
  const actualLowStockCount = lowStockItems?.length || 0;

  // Calculate filtered sales based on selected date range
  const calculateFilteredSales = () => {
    if (!salesTrend || salesTrend.length === 0) return 0;

    return salesTrend.reduce((total, item) => total + (item.sales || 0), 0);
  };

  if (statsLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-96">
          <Loader
            title="در حال بارگذاری داشبورد..."
            subtitle="لطفاً منتظر بمانید"
            size="md"
          />
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">
            خطا در بارگذاری داشبورد
          </h2>
          <p className="text-muted-foreground mb-4">
            بارگذاری اطلاعات داشبورد با خطا مواجه شد
          </p>
          <Button onClick={refreshAll} disabled={isRefreshing}>
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-2" />
            ) : null}
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            داشبورد مدیریت
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            نمای کلی جامع از عملکرد کسب و کار شما
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="text-xs sm:text-sm text-muted-foreground shrink-0">
            آخرین بروزرسانی: {lastUpdated.toLocaleTimeString("fa-IR")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 shrink-0"
          >
            {isRefreshing ? (
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">بروزرسانی</span>
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg bg-mechanical">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium text-sm sm:text-base">فیلتر زمانی</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              انتخاب بازه زمانی برای نمایش اطلاعات
            </p>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              مجموع فروش
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {stats?.totalSales?.toLocaleString("fa-IR") || 0} افغانی
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats?.monthlySales?.toLocaleString("fa-IR") || 0} این ماه
            </p>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              پرداختی‌های جمع‌آوری شده
            </CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {stats?.totalPaid?.toLocaleString("fa-IR") || 0} افغانی
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.paymentCompletionRate?.toFixed(1) || 0}% نرخ تکمیل پرداخت
            </p>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              مانده حساب
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-amber-600">
              {stats?.totalOutstanding?.toLocaleString("fa-IR") || 0} افغانی
            </div>
            <p className="text-xs text-muted-foreground">
              بین {stats?.totalCustomers || 0} مشتری
            </p>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              مجموع مصارف
            </CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {expenseData?.totalExpenses?.toLocaleString("fa-IR") || 0} افغانی
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseData?.totalCategories || 0} دسته‌بندی مختلف
            </p>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              هشدار کمبود موجودی
            </CardTitle>
            <PackageSearch className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {actualLowStockCount.toLocaleString("fa-IR")}
            </div>
            <p className="text-xs text-muted-foreground">
              موارد زیر سطح حداقل موجودی
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Data */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            نمای کلی
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
            مصارف
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <Package className="h-3 w-3 sm:h-4 sm:w-4" />
            موجودی
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            عملکرد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Sales Trend Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  روند فروش
                  {dateRange.from && dateRange.to && (
                    <span className="text-xs text-muted-foreground">
                      ({format(dateRange.from, "yyyy/MM/dd", { locale: faIR })}{" "}
                      - {format(dateRange.to, "yyyy/MM/dd", { locale: faIR })})
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  فروش روزانه و جمع‌آوری پرداختی‌ها
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {trendLoading ? (
                  <div className="flex items-center justify-center h-48 sm:h-64">
                    <Loader
                      title="در حال بارگذاری نمودار فروش..."
                      subtitle="لطفاً منتظر بمانید"
                      size="sm"
                    />
                  </div>
                ) : salesTrend && salesTrend.length > 0 ? (
                  <>
                    <SalesTrendChart data={salesTrend} />
                    <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        فروش
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        پرداختی‌ها
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                    <p>اطلاعات فروشی موجود نیست</p>
                    <p className="text-xs mt-1">
                      برای بازه انتخاب شده داده‌ای یافت نشد
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Payment Status Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  وضعیت پرداخت
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  توزیع وضعیت تکمیل پرداخت
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {paymentLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader
                      title="در حال بارگذاری وضعیت پرداخت..."
                      subtitle="لطفاً منتظر بمانید"
                      size="sm"
                    />
                  </div>
                ) : paymentStatus ? (
                  <PaymentStatusChart data={paymentStatus} />
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    اطلاعات پرداختی موجود نیست
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense Analytics */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Expense Trend Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  روند مصارف
                  {dateRange.from && dateRange.to && (
                    <span className="text-xs text-muted-foreground">
                      ({format(dateRange.from, "yyyy/MM/dd", { locale: faIR })}{" "}
                      - {format(dateRange.to, "yyyy/MM/dd", { locale: faIR })})
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  مصارف روزانه بر اساس دسته‌بندی
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {expenseLoading ? (
                  <div className="flex items-center justify-center h-48 sm:h-64">
                    <Loader
                      title="در حال بارگذاری نمودار مصارف..."
                      subtitle="لطفاً منتظر بمانید"
                      size="sm"
                    />
                  </div>
                ) : expenseData && expenseData.expenseTrend.length > 0 ? (
                  <ExpenseChart data={expenseData} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-muted-foreground">
                    <Receipt className="h-12 w-12 mb-2 opacity-50" />
                    <p>اطلاعات مصارفی موجود نیست</p>
                    <p className="text-xs mt-1">
                      برای بازه انتخاب شده داده‌ای یافت نشد
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Category Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  دسته‌بندی مصارف
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  توزیع مصارف بر اساس دسته‌بندی
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {expenseLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader
                      title="در حال بارگذاری نمودار دسته‌بندی..."
                      subtitle="لطفاً منتظر بمانید"
                      size="sm"
                    />
                  </div>
                ) : expenseData && expenseData.categoryBreakdown.length > 0 ? (
                  <ExpenseCategoryChart data={expenseData.categoryBreakdown} />
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    اطلاعات دسته‌بندی موجود نیست
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  {salesCardInfo.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {calculateFilteredSales().toLocaleString("fa-IR") || 0} افغانی
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <CalendarIcon className="h-3 w-3 ml-1" />
                  {salesCardInfo.dateText}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  مجموع مصارف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {expenseData?.totalExpenses?.toLocaleString("fa-IR") || 0}{" "}
                  افغانی
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Receipt className="h-3 w-3 ml-1" />
                  {salesCardInfo.dateText}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  سود ناخالص
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {expenseData?.profitAnalysis?.grossProfit?.toLocaleString(
                    "fa-IR"
                  ) || 0}{" "}
                  افغانی
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 ml-1" />
                  حاشیه سود:{" "}
                  {expenseData?.profitAnalysis?.profitMargin?.toFixed(1) || 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  سود خالص
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {expenseData?.profitAnalysis?.netProfit?.toLocaleString(
                    "fa-IR"
                  ) || 0}{" "}
                  افغانی
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Calculator className="h-3 w-3 ml-1" />
                  پس از کسر تمام مصارف
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  مجموع قطعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {stats?.totalParts?.toLocaleString("fa-IR") || 0}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Package className="h-3 w-3 ml-1" />
                  در موجودی
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                  تحلیل مصارف
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  اطلاعات جامع مصارف و هزینه‌ها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    مجموع مصارف
                  </span>
                  <span className="font-medium text-sm sm:text-base text-red-600">
                    {expenseData?.totalExpenses?.toLocaleString("fa-IR") || 0}{" "}
                    افغانی
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    تعداد دسته‌بندی
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {expenseData?.totalCategories || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    میانگین مصرف
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {expenseData?.averageExpense?.toLocaleString("fa-IR") || 0}{" "}
                    افغانی
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    بیشترین دسته‌بندی
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {expenseData?.topCategory || "نامشخص"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  مقایسه دوره‌ای
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  تغییرات مصارف در مقایسه با دوره‌های قبل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    تغییر هفتگی
                  </span>
                  <span
                    className={`font-medium text-sm sm:text-base ${
                      (expenseData?.weeklyComparison?.percentageChange || 0) >=
                      0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {expenseData?.weeklyComparison?.percentageChange?.toFixed(
                      1
                    ) || 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    تغییر ماهانه
                  </span>
                  <span
                    className={`font-medium text-sm sm:text-base ${
                      (expenseData?.monthlyComparison?.percentageChange || 0) >=
                      0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {expenseData?.monthlyComparison?.percentageChange?.toFixed(
                      1
                    ) || 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    مصارف این هفته
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {expenseData?.weeklyComparison?.currentWeek?.toLocaleString(
                      "fa-IR"
                    ) || 0}{" "}
                    افغانی
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    مصارف این ماه
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {expenseData?.monthlyComparison?.currentMonth?.toLocaleString(
                      "fa-IR"
                    ) || 0}{" "}
                    افغانی
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                تحلیل سود و زیان
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                مقایسه درآمدها و مصارف برای محاسبه سود خالص
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenseData?.profitAnalysis ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {expenseData.profitAnalysis.totalRevenue?.toLocaleString(
                        "fa-IR"
                      ) || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      مجموع درآمد
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-bold text-red-600">
                      {expenseData.profitAnalysis.totalExpenses?.toLocaleString(
                        "fa-IR"
                      ) || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      مجموع مصارف
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div
                      className={`text-lg font-bold ${
                        (expenseData.profitAnalysis.grossProfit || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {expenseData.profitAnalysis.grossProfit?.toLocaleString(
                        "fa-IR"
                      ) || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      سود ناخالص
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div
                      className={`text-lg font-bold ${
                        (expenseData.profitAnalysis.profitMargin || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {expenseData.profitAnalysis.profitMargin?.toFixed(1) || 0}
                      %
                    </div>
                    <div className="text-xs text-muted-foreground">
                      حاشیه سود
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>اطلاعات تحلیل سود موجود نیست</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">
                اقدامات سریع مصارف
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                دسترسی سریع به مدیریت مصارف
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/admin/expenses">
                    <Receipt className="h-6 w-6 text-primary" />
                    <span className="text-sm">مدیریت مصارف</span>
                    <span className="text-xs text-muted-foreground">
                      مشاهده و ویرایش
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/admin/expenses">
                    <Plus className="h-6 w-6 text-green-600" />
                    <span className="text-sm">افزودن مصرف</span>
                    <span className="text-xs text-muted-foreground">
                      ثبت مصرف جدید
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/admin/expenses">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    <span className="text-sm">گزارش تفصیلی</span>
                    <span className="text-xs text-muted-foreground">
                      تحلیل کامل
                    </span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                هشدار کمبود موجودی (
                {actualLowStockCount.toLocaleString("fa-IR")} مورد)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                مواردی که نیاز به توجه فوری دارند - موجودی فعلی زیر آستانه حداقل
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader
                    title="در حال بارگذاری هشدارهای موجودی..."
                    subtitle="لطفاً منتظر بمانید"
                    size="sm"
                  />
                </div>
              ) : lowStockItems && lowStockItems.length > 0 ? (
                <>
                  {/* Mobile View */}
                  <MobileLowStockTable items={lowStockItems} />

                  {/* Desktop View */}
                  <div className="hidden sm:block rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">
                              شماره قطعه
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              نام
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              بخش
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              حداقل موجودی
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              موجودی فعلی
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              کمبود
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              وضعیت
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                              عملیات
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockItems.map((item) => {
                            const deficit = item.min_stock - item.current_stock;
                            return (
                              <TableRow
                                key={item.id}
                                className="hover:bg-muted/50"
                              >
                                <TableCell className="font-mono whitespace-nowrap">
                                  {item.part_number}
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {item.name}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.section}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {item.min_stock.toLocaleString("fa-IR")}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span
                                    className={
                                      item.current_stock === 0
                                        ? "text-red-600 font-bold"
                                        : item.current_stock <
                                            item.min_stock / 2
                                          ? "text-orange-600 font-medium"
                                          : "text-amber-600"
                                    }
                                  >
                                    {item.current_stock.toLocaleString("fa-IR")}
                                  </span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="text-red-600 font-medium">
                                    -{deficit.toLocaleString("fa-IR")}
                                  </span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <Badge
                                    variant={
                                      item.current_stock === 0
                                        ? "destructive"
                                        : "outline"
                                    }
                                    className={
                                      item.current_stock === 0
                                        ? "bg-red-600"
                                        : item.current_stock <
                                            item.min_stock / 2
                                          ? "border-orange-600 text-orange-600 bg-orange-50"
                                          : "border-amber-600 text-amber-600 bg-amber-50"
                                    }
                                  >
                                    {item.current_stock === 0
                                      ? "تمام شده"
                                      : item.current_stock < item.min_stock / 2
                                        ? "بحرانی"
                                        : "موجودی کم"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/parts/${item.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>هیچ مورد کمبود موجودی وجود ندارد</p>
                  <p className="text-sm">
                    همه موارد به اندازه کافی موجود هستند
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  عملکرد فروش
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  معیارها و روندهای کلیدی فروش
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    فروش ماهانه
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {stats?.monthlySales?.toLocaleString("fa-IR") || 0} افغانی
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    میانگین ارزش فروش
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {stats?.totalSales && stats.totalCustomers
                      ? (
                          stats.totalSales / Math.max(stats.totalCustomers, 1)
                        ).toLocaleString("fa-IR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : 0}{" "}
                    افغانی
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    نرخ جمع‌آوری پرداخت
                  </span>
                  <span className="font-medium text-green-600 text-sm sm:text-base">
                    {stats?.paymentCompletionRate?.toFixed(1) || 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  بینش مشتری
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  رفتار و الگوهای مشتری
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    مجموع مشتریان
                  </span>
                  <span className="font-medium text-sm sm:text-base">
                    {stats?.totalCustomers?.toLocaleString("fa-IR") || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    فعال این ماه
                  </span>
                  <span className="font-medium text-sm sm:text-base">-</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    مانده حساب
                  </span>
                  <span className="font-medium text-amber-600 text-sm sm:text-base">
                    {stats?.totalOutstanding?.toLocaleString("fa-IR") || 0}{" "}
                    افغانی
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">
                اقدامات اولویت‌دار
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                وظایفی که نیاز به توجه فوری دارند
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actualLowStockCount > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg dark:bg-stone-950 border-red-200 gap-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-500 text-sm sm:text-base">
                          تکمیل موجودی
                        </div>
                        <div className="text-xs sm:text-sm text-red-400">
                          {actualLowStockCount.toLocaleString("fa-IR")} مورد زیر
                          سطح حداقل موجودی هستند
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-500 whitespace-nowrap"
                      asChild
                    >
                      <Link href="/parts/priority-actions">
                        اقدامات اولویت‌دار
                      </Link>
                    </Button>
                  </div>
                )}

                {stats?.totalOutstanding && stats.totalOutstanding > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg dark:bg-stone-950 border-amber-200 gap-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-amber-600" />
                      <div>
                        <div className="font-medium dark:text-amber-500 text-sm sm:text-base">
                          جمع‌آوری پرداختی‌ها
                        </div>
                        <div className="text-xs sm:text-sm text-amber-400">
                          {stats.totalOutstanding.toLocaleString("fa-IR")}{" "}
                          افغانی پرداخت معوق
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-300 text-amber-500 whitespace-nowrap"
                      asChild
                    >
                      <Link href="/dashboards/admin/sales">بررسی فروش</Link>
                    </Button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg dark:bg-stone-950 border-blue-200 gap-3">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900 text-sm sm:text-base">
                        بررسی عملکرد
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700">
                        تحلیل روند فروش و رفتار مشتری
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 whitespace-nowrap"
                  >
                    تحلیل
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
