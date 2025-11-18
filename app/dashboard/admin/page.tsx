// app/dashboards/admin/page.tsx

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
} from "lucide-react";
import Link from "next/link";
import {
  format,
  startOfToday,
  startOfWeek,
  startOfMonth,
  subDays,
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

interface DateRange {
  from: Date;
  to: Date;
}

// API functions - Updated to include date range
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

  const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch dashboard stats");
  return response.json();
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
  if (dateRange?.from) {
    params.append("from", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    params.append("to", dateRange.to.toISOString());
  }

  const response = await fetch(
    `/api/dashboard/sales-trend?${params.toString()}`
  );
  if (!response.ok) throw new Error("Failed to fetch sales trend");
  return response.json();
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
            "w-full sm:w-[260px] justify-start text-left font-normal",
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
      <PopoverContent
        className="w-auto p-0 z-50"
        align="start"
        sideOffset={5}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
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
// Chart components (simplified - you can replace with actual chart libraries)
const SalesTrendChart = ({ data }: { data: SalesTrend[] }) => {
  const maxSales = Math.max(...data.map((item) => item.sales), 1);

  return (
    <div className="w-full h-48 sm:h-64 flex items-end justify-between gap-1 sm:gap-2 pt-4">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1">
          <div className="text-xs text-muted-foreground mb-1 hidden sm:block">
            {new Date(item.date).toLocaleDateString("fa-IR")}
          </div>
          <div className="flex items-end gap-0.5 sm:gap-1 w-full justify-center">
            <div
              className="bg-blue-500 rounded-t w-3/4 transition-all duration-300 hover:bg-blue-600"
              style={{ height: `${(item.sales / maxSales) * 80}%` }}
              title={`فروش: ${item.sales.toLocaleString("fa-IR")}`}
            />
            <div
              className="bg-green-500 rounded-t w-3/4 transition-all duration-300 hover:bg-green-600"
              style={{ height: `${(item.payments / maxSales) * 80}%` }}
              title={`پرداختی: ${item.payments.toLocaleString("fa-IR")}`}
            />
          </div>
        </div>
      ))}
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

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchLowStock(),
        refetchTrend(),
        refetchPayment(),
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

  if (statsLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">در حال بارگذاری داشبورد...</p>
          </div>
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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            نمای کلی
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
                  روند فروش (۷ روز گذشته)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  فروش روزانه و جمع‌آوری پرداختی‌ها
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {trendLoading ? (
                  <div className="flex items-center justify-center h-48 sm:h-64">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : salesTrend && salesTrend.length > 0 ? (
                  <SalesTrendChart data={salesTrend} />
                ) : (
                  <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
                    اطلاعات فروشی موجود نیست
                  </div>
                )}
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
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
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

          {/* Quick Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  فروش امروز
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {stats?.todaySales?.toLocaleString("fa-IR") || 0} افغانی
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 ml-1" />
                  {new Date().toLocaleDateString("fa-IR")}
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  مشتریان فعال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {stats?.totalCustomers?.toLocaleString("fa-IR") || 0}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Users className="h-3 w-3 ml-1" />
                  با سابقه خرید
                </div>
              </CardContent>
            </Card>
          </div>
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
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-red-50 border-red-200 gap-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900 text-sm sm:text-base">
                          تکمیل موجودی
                        </div>
                        <div className="text-xs sm:text-sm text-red-700">
                          {actualLowStockCount.toLocaleString("fa-IR")} مورد زیر
                          سطح حداقل موجودی هستند
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 whitespace-nowrap"
                      asChild
                    >
                      <Link href="/parts/manage">مدیریت قطعات</Link>
                    </Button>
                  </div>
                )}

                {stats?.totalOutstanding && stats.totalOutstanding > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-amber-50 border-amber-200 gap-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-amber-600" />
                      <div>
                        <div className="font-medium text-amber-900 text-sm sm:text-base">
                          جمع‌آوری پرداختی‌ها
                        </div>
                        <div className="text-xs sm:text-sm text-amber-700">
                          {stats.totalOutstanding.toLocaleString("fa-IR")}{" "}
                          افغانی پرداخت معوق
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-300 text-amber-700 whitespace-nowrap"
                      asChild
                    >
                      <Link href="/dashboards/admin/sales">بررسی فروش</Link>
                    </Button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200 gap-3">
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
