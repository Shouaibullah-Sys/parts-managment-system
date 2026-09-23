// app/dashboard/admin/components/SalesTab.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  Package,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
} from "lucide-react";
import Loader from "@/components/loader";
import { format, startOfToday, startOfWeek, startOfMonth } from "date-fns";

interface SaleRecord {
  id: number;
  customerName: string;
  normalizedName: string;
  totalAmount: string;
  paidAmount: string;
  actualPaidAmount: string;
  outstanding: string;
  isFullyPaid: boolean;
  issueDate: string;
  quantity: number;
  issuedBy: string;
  partNumber: string;
  partName: string;
  section: string | null;
}

interface SalesSummary {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  count: number;
}

interface SalesResponse {
  success: boolean;
  data: SaleRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: SalesSummary;
}

interface SectionOption {
  section: string;
  salesCount: number;
}

type QuickPeriod = "today" | "week" | "month" | "all" | "custom";

const PAGE_SIZE = 20;

const fetchSales = async (params: {
  fromDate: string;
  toDate: string;
  section: string;
  page: number;
}): Promise<SalesResponse> => {
  const searchParams = new URLSearchParams({
    period: "lifetime",
    page: params.page.toString(),
    limit: PAGE_SIZE.toString(),
  });
  if (params.fromDate) searchParams.set("fromDate", params.fromDate);
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (params.section) searchParams.set("section", params.section);

  const response = await fetch(`/api/sales?${searchParams.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch sales data");
  return response.json();
};

const fetchSections = async (params: {
  fromDate: string;
  toDate: string;
}): Promise<SectionOption[]> => {
  const searchParams = new URLSearchParams();
  if (params.fromDate) searchParams.set("fromDate", params.fromDate);
  if (params.toDate) searchParams.set("toDate", params.toDate);

  const response = await fetch(`/api/parts/sections?${searchParams.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch sections");
  const json = await response.json();
  return json.data || [];
};

export default function SalesTab() {
  const todayStr = format(startOfToday(), "yyyy-MM-dd");
  const nowStr = format(new Date(), "yyyy-MM-dd");

  const [dateRange, setDateRange] = useState({ from: todayStr, to: nowStr });
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>("today");
  const [section, setSection] = useState<string>("all");
  const [page, setPage] = useState(1);

  const applyPeriod = (period: QuickPeriod) => {
    const now = new Date();
    let from = "";
    let to = "";

    switch (period) {
      case "today":
        from = format(startOfToday(), "yyyy-MM-dd");
        to = format(now, "yyyy-MM-dd");
        break;
      case "week":
        from = format(startOfWeek(now), "yyyy-MM-dd");
        to = format(now, "yyyy-MM-dd");
        break;
      case "month":
        from = format(startOfMonth(now), "yyyy-MM-dd");
        to = format(now, "yyyy-MM-dd");
        break;
      case "all":
        from = "";
        to = "";
        break;
    }

    setDateRange({ from, to });
    setQuickPeriod(period);
    setPage(1);
  };

  const { data: sections } = useQuery({
    queryKey: ["sales-sections", dateRange.from, dateRange.to],
    queryFn: () =>
      fetchSections({ fromDate: dateRange.from, toDate: dateRange.to }),
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "dashboard-sales",
      dateRange.from,
      dateRange.to,
      section,
      page,
    ],
    queryFn: () =>
      fetchSales({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        section: section === "all" ? "" : section,
        page,
      }),
    placeholderData: (prev) => prev,
  });

  const summary = data?.summary;
  const rows = data?.data || [];
  const pagination = data?.pagination;

  const handleDateChange = (field: "from" | "to", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setQuickPeriod("custom");
    setPage(1);
  };

  const quickBtnClass = (period: QuickPeriod) =>
    quickPeriod === period
      ? "bg-primary text-primary-foreground"
      : "bg-background";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-mechanical border-mechanical shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">فیلترها</span>

            {/* Quick period buttons */}
            <div className="flex flex-wrap gap-1 mr-2">
              <Button
                variant={quickPeriod === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPeriod("today")}
                className={quickBtnClass("today")}
              >
                امروز
              </Button>
              <Button
                variant={quickPeriod === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPeriod("week")}
                className={quickBtnClass("week")}
              >
                هفته
              </Button>
              <Button
                variant={quickPeriod === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPeriod("month")}
                className={quickBtnClass("month")}
              >
                ماه
              </Button>
              <Button
                variant={quickPeriod === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPeriod("all")}
                className={quickBtnClass("all")}
              >
                همه
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">از:</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">تا:</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className="w-36"
              />
            </div>

            {/* Section filter */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Select
                value={section}
                onValueChange={(value) => {
                  setSection(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="بخش" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه بخش‌ها</SelectItem>
                  {sections?.map((s) => (
                    <SelectItem key={s.section} value={s.section}>
                      {s.section} ({s.salesCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              مجموع فروش
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-primary">
              {(summary?.totalSales || 0).toLocaleString("fa-IR")} افغانی
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              پرداخت شده
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {(summary?.totalPaid || 0).toLocaleString("fa-IR")} افغانی
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              باقی‌مانده
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-amber-600">
              {(summary?.totalOutstanding || 0).toLocaleString("fa-IR")} افغانی
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              تعداد تراکنش
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {(summary?.count || 0).toLocaleString("fa-IR")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales table */}
      <Card className="border-mechanical shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm sm:text-base">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              فروش‌ها
              {isFetching && !isLoading && (
                <RefreshIndicator />
              )}
            </span>
            {pagination && (
              <span className="text-xs font-normal text-muted-foreground">
                {pagination.total.toLocaleString("fa-IR")} رکورد
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader
                title="در حال بارگذاری فروش‌ها..."
                subtitle="لطفاً منتظر بمانید"
                size="sm"
              />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-70" />
              <p>خطا در بارگذاری اطلاعات فروش</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">فروشی یافت نشد</p>
              <p className="text-sm mt-1">
                برای فیلترهای انتخاب شده داده‌ای موجود نیست
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>مشتری</TableHead>
                    <TableHead>قطعه</TableHead>
                    <TableHead>بخش</TableHead>
                    <TableHead>تعداد</TableHead>
                    <TableHead>مبلغ کل</TableHead>
                    <TableHead>پرداخت شده</TableHead>
                    <TableHead>باقی‌مانده</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>صادرکننده</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {sale.customerName || "نامشخص"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {sale.partName}
                          </div>
                          {sale.partNumber && (
                            <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                              {sale.partNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {sale.section || "E"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.quantity}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {parseFloat(sale.totalAmount).toLocaleString("fa-IR")}{" "}
                        افغانی
                      </TableCell>
                      <TableCell className="text-green-600 font-medium whitespace-nowrap">
                        {parseFloat(
                          sale.actualPaidAmount || sale.paidAmount || "0"
                        ).toLocaleString("fa-IR")}{" "}
                        افغانی
                      </TableCell>
                      <TableCell className="text-amber-600 font-medium whitespace-nowrap">
                        {parseFloat(sale.outstanding || "0").toLocaleString(
                          "fa-IR"
                        )}{" "}
                        افغانی
                      </TableCell>
                      <TableCell>
                        {sale.isFullyPaid ? (
                          <Badge className="bg-green-600 text-xs">
                            <CheckCircle className="h-3 w-3 ml-1" />
                            پرداخت کامل
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-600 text-amber-600 text-xs"
                          >
                            <AlertCircle className="h-3 w-3 ml-1" />
                            بدهکار
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(sale.issueDate).toLocaleDateString("fa-IR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sale.issuedBy || "نامشخص"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                صفحه {pagination.page.toLocaleString("fa-IR")} از{" "}
                {pagination.totalPages.toLocaleString("fa-IR")}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  بعدی
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RefreshIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
      <CreditCard className="h-3 w-3 animate-pulse" />
      در حال بروزرسانی...
    </span>
  );
}
