"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  Package,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Users,
  DollarSign,
  BarChart3,
  PackageSearch,
  RefreshCw,
} from "lucide-react";

// Types
import {
  DateRange,
  DashboardStats,
  LowStockItem,
  SalesTrend,
  PaymentStatus,
} from "@/types/dashboard";

// API functions
import {
  fetchDashboardStats,
  fetchLowStockItems,
  fetchSalesTrend,
  fetchPaymentStatus,
  fetchExpenseReports,
} from "@/lib/api/dashboard";

// Components
import { DateRangePicker } from "./DateRangePicker";
import { SalesTrendChart } from "./SalesTrendChart";
import { PaymentStatusChart } from "./PaymentStatusChart";
import { LowStockTable, DesktopLowStockTable } from "./LowStockTable";
import { DashboardHeader } from "./DashboardHeader";
import { ExpenseCategoryChart } from "./ExpenseCategoryChart";
import { ExpenseTrendChart } from "./ExpenseTrendChart";
import { ProfitAnalysisChart } from "./ProfitAnalysisChart";

// Utils
import { getSalesCardInfo } from "@/lib/utils/dashboard";

// Loader
import Loader from "@/components/loader";

// Error Boundary
import DashboardErrorBoundary from "./DashboardErrorBoundary";

interface DashboardClientProps {
  initialStats: DashboardStats;
  initialLowStockItems: LowStockItem[];
  initialSalesTrend: SalesTrend[];
  initialPaymentStatus: PaymentStatus;
  initialExpenseReports?: any;
  initialDateRange: DateRange;
}

export function DashboardClient({
  initialStats,
  initialLowStockItems,
  initialSalesTrend,
  initialPaymentStatus,
  initialExpenseReports,
  initialDateRange,
}: DashboardClientProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get dynamic sales card info based on date range
  const salesCardInfo = getSalesCardInfo(dateRange);

  // Queries with date range - using initial data from server
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats", dateRange],
    queryFn: () => fetchDashboardStats(dateRange),
    initialData: initialStats,
    refetchInterval: 30000,
  });

  const {
    data: lowStockItems,
    isLoading: lowStockLoading,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: fetchLowStockItems,
    initialData: initialLowStockItems,
  });

  const {
    data: salesTrend,
    isLoading: trendLoading,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ["sales-trend", dateRange],
    queryFn: () => fetchSalesTrend(dateRange),
    initialData: initialSalesTrend,
  });

  const {
    data: paymentStatus,
    isLoading: paymentLoading,
    refetch: refetchPayment,
  } = useQuery({
    queryKey: ["payment-status", dateRange],
    queryFn: () => fetchPaymentStatus(dateRange),
    initialData: initialPaymentStatus,
  });

  const {
    data: expenseReports,
    isLoading: expenseLoading,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expense-reports", dateRange],
    queryFn: () => fetchExpenseReports(dateRange),
    initialData: initialExpenseReports,
    refetchInterval: 30000,
  });

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchLowStock(),
        refetchTrend(),
        refetchPayment(),
        refetchExpenses(),
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

  if (statsError) {
    throw statsError; // Let error boundary handle it
  }

  return (
    <DashboardErrorBoundary>
      <div className="container mx-auto py-6 px-3 sm:px-6 space-y-6">
        {/* Header */}
        <DashboardHeader
          lastUpdated={lastUpdated}
          onRefresh={refreshAll}
          isRefreshing={isRefreshing}
        />

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
                {stats?.paymentCompletionRate?.toFixed(1) || 0}% نرخ تکمیل
                پرداخت
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger
              value="expenses"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              گزارش مصارف
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

            {/* Quick Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {salesCardInfo.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">
                    {stats?.totalSales?.toLocaleString("fa-IR") || 0} افغانی
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
                  مواردی که نیاز به توجه فوری دارند - موجودی فعلی زیر آستانه
                  حداقل
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
                    <LowStockTable items={lowStockItems} />
                    <DesktopLowStockTable items={lowStockItems} />
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
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    معیارهای عملکرد
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    شاخص‌های کلیدی عملکرد تجاری
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 grid-cols-2">
                    <div className="text-center p-3 bg-mechanical rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-primary">
                        {stats?.totalSales && stats.totalCustomers
                          ? Math.round(
                              stats.totalSales / stats.totalCustomers
                            ).toLocaleString("fa-IR")
                          : 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        میانگین ارزش سفارش
                      </div>
                      <div className="text-xs text-muted-foreground">
                        افغانی
                      </div>
                    </div>
                    <div className="text-center p-3 bg-mechanical rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-green-600">
                        {stats?.paymentCompletionRate?.toFixed(1) || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        نرخ تکمیل پرداخت
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">فروش امروز</span>
                      <span className="font-medium">
                        {stats?.todaySales?.toLocaleString("fa-IR") || 0} افغانی
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">فروش این ماه</span>
                      <span className="font-medium">
                        {stats?.monthlySales?.toLocaleString("fa-IR") || 0}{" "}
                        افغانی
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">تعداد مشتریان</span>
                      <span className="font-medium">
                        {stats?.totalCustomers?.toLocaleString("fa-IR") || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">تعداد قطعات</span>
                      <span className="font-medium">
                        {stats?.totalParts?.toLocaleString("fa-IR") || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    تحلیل عملکرد
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    ارزیابی عملکرد بر اساس بازه زمانی انتخاب شده
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sales Trend Analysis */}
                    {trendLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader
                          title="در حال تحلیل عملکرد..."
                          subtitle="لطفاً منتظر بمانید"
                          size="sm"
                        />
                      </div>
                    ) : salesTrend && salesTrend.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm font-medium">روند فروش:</div>
                        <div className="grid gap-2">
                          <div className="flex justify-between">
                            <span className="text-xs">
                              بالاترین فروش روزانه:
                            </span>
                            <span className="text-xs font-medium">
                              {Math.max(
                                ...salesTrend.map((d) => d.sales || 0)
                              ).toLocaleString("fa-IR")}{" "}
                              افغانی
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">
                              میانگین فروش روزانه:
                            </span>
                            <span className="text-xs font-medium">
                              {Math.round(
                                salesTrend.reduce(
                                  (acc, d) => acc + (d.sales || 0),
                                  0
                                ) / salesTrend.length
                              ).toLocaleString("fa-IR")}{" "}
                              افغانی
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">روزهای فعال:</span>
                            <span className="text-xs font-medium">
                              {
                                salesTrend.filter((d) => (d.sales || 0) > 0)
                                  .length
                              }{" "}
                              از {salesTrend.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        اطلاعات روند فروش موجود نیست
                      </div>
                    )}

                    {/* Inventory Performance */}
                    <div className="pt-3 border-t">
                      <div className="text-sm font-medium mb-2">
                        عملکرد موجودی:
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs">موارد کمبود موجودی:</span>
                          <span className="text-xs font-medium text-red-600">
                            {actualLowStockCount.toLocaleString("fa-IR")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs">نرخ موجودی کافی:</span>
                          <span className="text-xs font-medium text-green-600">
                            {stats?.totalParts
                              ? (
                                  ((stats.totalParts - actualLowStockCount) /
                                    stats.totalParts) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Performance Charts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  نمودارهای عملکرد
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  تحلیل بصری عملکرد کسب‌وکار
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader
                      title="در حال بارگذاری نمودارهای عملکرد..."
                      subtitle="لطفاً منتظر بمانید"
                      size="sm"
                    />
                  </div>
                ) : salesTrend && salesTrend.length > 0 ? (
                  <div className="space-y-6">
                    {/* Reuse the SalesTrendChart for performance analysis */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">
                        روند فروش و پرداختی‌ها
                      </h4>
                      <SalesTrendChart data={salesTrend} />
                    </div>

                    {/* Performance Insights */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="p-4 bg-mechanical rounded-lg">
                        <h5 className="text-sm font-medium text-green-600 mb-2">
                          نقاط قوت
                        </h5>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {stats?.paymentCompletionRate > 70 && (
                            <li>
                              • نرخ پرداخت بالا (
                              {stats.paymentCompletionRate.toFixed(1)}%)
                            </li>
                          )}
                          {actualLowStockCount <
                            (stats?.totalParts || 1) * 0.1 && (
                            <li>• مدیریت موجودی مناسب</li>
                          )}
                          {stats?.totalCustomers > 10 && (
                            <li>
                              • پایگاه مشتری مناسب ({stats.totalCustomers}{" "}
                              مشتری)
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="p-4 bg-mechanical rounded-lg">
                        <h5 className="text-sm font-medium text-amber-600 mb-2">
                          موارد بهبود
                        </h5>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {actualLowStockCount > 0 && (
                            <li>• {actualLowStockCount} مورد کمبود موجودی</li>
                          )}
                          {stats?.paymentCompletionRate < 80 && (
                            <li>• بهبود نرخ جمع‌آوری پرداختی‌ها</li>
                          )}
                          {salesTrend.length < 7 && (
                            <li>• افزایش فعالیت فروش روزانه</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                    <p>اطلاعات عملکردی موجود نیست</p>
                    <p className="text-xs mt-1">
                      برای نمایش نمودارهای عملکرد، داده‌های فروش مورد نیاز است
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            {/* Expense Summary Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    مجموع مصارف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {expenseReports?.totalExpenses?.toLocaleString("fa-IR") ||
                      0}{" "}
                    افغانی
                  </div>
                  <p className="text-xs text-muted-foreground">
                    در {expenseReports?.totalCategories || 0} دسته‌بندی
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    میانگین مصارف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {expenseReports?.averageExpense?.toLocaleString("fa-IR") ||
                      0}{" "}
                    افغانی
                  </div>
                  <p className="text-xs text-muted-foreground">
                    به ازای هر مصرف
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    بالاترین دسته
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-amber-600">
                    {expenseReports?.topCategory || "نامشخص"}
                  </div>
                  <p className="text-xs text-muted-foreground">بیشترین مصرف</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    تغییر هفتگی
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      (expenseReports?.weeklyComparison?.percentageChange ||
                        0) >= 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {expenseReports?.weeklyComparison?.percentageChange?.toFixed(
                      1
                    ) || 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">
                    نسبت به هفته قبل
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Expense Charts */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Expense Category Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    توزیع مصارف بر اساس دسته‌بندی
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    درصد مصرف در هر دسته‌بندی
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
                  ) : expenseReports?.categoryBreakdown &&
                    expenseReports.categoryBreakdown.length > 0 ? (
                    <ExpenseCategoryChart
                      data={expenseReports.categoryBreakdown}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      اطلاعات دسته‌بندی موجود نیست
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Trend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    روند مصرف روزانه
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    تغییرات مصرف در طول زمان
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {expenseLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader
                        title="در حال بارگذاری نمودار روند..."
                        subtitle="لطفاً منتظر بمانید"
                        size="sm"
                      />
                    </div>
                  ) : expenseReports?.expenseTrend &&
                    expenseReports.expenseTrend.length > 0 ? (
                    <>
                      <ExpenseTrendChart data={expenseReports.expenseTrend} />
                      <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          مصارف
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mb-2 opacity-50" />
                      <p>اطلاعات روند مصرف موجود نیست</p>
                      <p className="text-xs mt-1">
                        برای بازه انتخاب شده داده‌ای یافت نشد
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Profit Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  تحلیل سود و زیان
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  محاسبه سود ناخالص، خالص و نرخ سودآوری
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expenseLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader
                      title="در حال تحلیل سود و زیان..."
                      subtitle="لطفاً منتظر بمانید"
                      size="sm"
                    />
                  </div>
                ) : expenseReports?.profitAnalysis ? (
                  <ProfitAnalysisChart data={expenseReports.profitAnalysis} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    اطلاعات تحلیل سود موجود نیست
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Details */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Top Vendors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    بالاترین تامین‌کنندگان
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    بر اساس مبلغ کل خرید
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenseReports?.expenseByVendor &&
                  expenseReports.expenseByVendor.length > 0 ? (
                    <div className="space-y-3">
                      {expenseReports.expenseByVendor
                        .slice(0, 5)
                        .map((vendor: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="text-sm font-medium">
                                {vendor.vendor}
                              </span>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-semibold">
                                {vendor.amount.toLocaleString("fa-IR")} افغانی
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {vendor.count} تراکنش
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      اطلاعات تامین‌کنندگان موجود نیست
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    تحلیل مصارف
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    نکات مهم و توصیه‌ها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Weekly Analysis */}
                    <div className="p-3 bg-mechanical rounded-lg">
                      <h5 className="text-sm font-medium mb-2">
                        تغییرات هفتگی:
                      </h5>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>این هفته:</span>
                          <span className="font-medium">
                            {expenseReports?.weeklyComparison?.currentWeek?.toLocaleString(
                              "fa-IR"
                            ) || 0}{" "}
                            افغانی
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>هفته قبل:</span>
                          <span className="font-medium">
                            {expenseReports?.weeklyComparison?.previousWeek?.toLocaleString(
                              "fa-IR"
                            ) || 0}{" "}
                            افغانی
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>تغییر:</span>
                          <span
                            className={`font-medium ${
                              (expenseReports?.weeklyComparison
                                ?.percentageChange || 0) >= 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {expenseReports?.weeklyComparison?.percentageChange?.toFixed(
                              1
                            ) || 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Analysis */}
                    <div className="p-3 bg-mechanical rounded-lg">
                      <h5 className="text-sm font-medium mb-2">
                        تغییرات ماهانه:
                      </h5>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>این ماه:</span>
                          <span className="font-medium">
                            {expenseReports?.monthlyComparison?.currentMonth?.toLocaleString(
                              "fa-IR"
                            ) || 0}{" "}
                            افغانی
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>ماه قبل:</span>
                          <span className="font-medium">
                            {expenseReports?.monthlyComparison?.previousMonth?.toLocaleString(
                              "fa-IR"
                            ) || 0}{" "}
                            افغانی
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>تغییر:</span>
                          <span
                            className={`font-medium ${
                              (expenseReports?.monthlyComparison
                                ?.percentageChange || 0) >= 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {expenseReports?.monthlyComparison?.percentageChange?.toFixed(
                              1
                            ) || 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <h5 className="text-sm font-medium mb-2">توصیه‌ها:</h5>
                      <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                        {(expenseReports?.weeklyComparison?.percentageChange ||
                          0) > 20 && (
                          <li>• افزایش قابل توجه مصارف - نیاز به بررسی</li>
                        )}
                        {(expenseReports?.weeklyComparison?.percentageChange ||
                          0) < -10 && (
                          <li>• کاهش مطلوب مصارف - ادامه روند فعلی</li>
                        )}
                        {(expenseReports?.profitAnalysis?.profitMargin || 0) <
                          10 && <li>• نرخ سود پایین - بررسی هزینه‌ها</li>}
                        {(expenseReports?.profitAnalysis?.profitMargin || 0) >
                          25 && <li>• عملکرد سودآوری عالی</li>}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardErrorBoundary>
  );
}
