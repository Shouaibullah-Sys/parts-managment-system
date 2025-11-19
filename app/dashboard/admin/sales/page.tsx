// app/dashboards/admin/sales/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { format, startOfToday, startOfWeek, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  RefreshCw,
  CreditCard,
  Smartphone,
  Monitor,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
} from "lucide-react";
import Loader from "@/components/loader";

interface SaleRecord {
  id: number;
  customerName: string;
  normalizedName: string;
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
  isFullyPaid: boolean;
  issueDate: string;
  quantity: number;
  issuedBy: string;
  partNumber: string;
  partName: string;
  itemCount: number;
  status: "completed" | "pending" | "approved";
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SalesResponse {
  success: boolean;
  data: SaleRecord[];
  pagination: PaginationInfo;
}

// Date period types
type DatePeriod = "today" | "week" | "month" | "lifetime";

// Fetch sales data with React Query
const fetchSalesData = async ({
  page = 1,
  limit = 100,
  search = "",
  fromDate = "",
  toDate = "",
  period = "today",
}: {
  page: number;
  limit: number;
  search: string;
  fromDate: string;
  toDate: string;
  period: DatePeriod;
}): Promise<SalesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
    period,
  });

  const response = await fetch(`/api/sales?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch sales data");
  }
  return response.json();
};

export default function AdminSalesPage() {
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(startOfToday(), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("today");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // React Query for sales data
  const {
    data: salesData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: [
      "sales",
      {
        search: searchTerm,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        period: datePeriod,
      },
    ],
    queryFn: () =>
      fetchSalesData({
        page: 1,
        limit: 100,
        search: searchTerm,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        period: datePeriod,
      }),
  });

  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState<{
    isOpen: boolean;
    saleId: number | null;
    customerName: string;
    partName: string;
    outstandingAmount: string;
  }>({
    isOpen: false,
    saleId: null,
    customerName: "",
    partName: "",
    outstandingAmount: "0",
  });

  // Bulk Payment Dialog State
  const [bulkPaymentDialog, setBulkPaymentDialog] = useState<{
    isOpen: boolean;
    customerName: string;
    normalizedName: string;
    totalOutstanding: number;
  }>({
    isOpen: false,
    customerName: "",
    normalizedName: "",
    totalOutstanding: 0,
  });

  const [bulkPaymentAmount, setBulkPaymentAmount] = useState("");
  const [bulkPaymentNote, setBulkPaymentNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingBulkPayment, setIsProcessingBulkPayment] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Apply date period filters
  const applyDatePeriod = (period: DatePeriod) => {
    const today = new Date();
    let from = "";
    let to = format(today, "yyyy-MM-dd");

    switch (period) {
      case "today":
        from = format(startOfToday(), "yyyy-MM-dd");
        break;
      case "week":
        from = format(startOfWeek(today), "yyyy-MM-dd");
        break;
      case "month":
        from = format(startOfMonth(today), "yyyy-MM-dd");
        break;
      case "lifetime":
        from = "";
        to = "";
        break;
    }

    setDateRange({ from, to });
    setDatePeriod(period);
  };

  // Define columns for TanStack Table
  const salesColumns: ColumnDef<SaleRecord>[] = [
    {
      accessorKey: "customerName",
      header: "مشتری",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {row.original.customerName}
        </div>
      ),
    },
    {
      accessorKey: "partName",
      header: "قطعه",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">
            {row.original.partName}
          </div>
          {row.original.partNumber && (
            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">
              {row.original.partNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "تعداد",
      cell: ({ row }) => (
        <div className="text-center">{row.original.quantity}</div>
      ),
    },
    {
      accessorKey: "issueDate",
      header: "تاریخ",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {new Date(row.original.issueDate).toLocaleDateString("fa-IR")}
        </div>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "مبلغ کل",
      cell: ({ row }) => (
        <div className="font-medium">
          {parseFloat(row.original.totalAmount).toLocaleString()} افغانی
        </div>
      ),
    },
    {
      accessorKey: "paidAmount",
      header: "پرداخت شده",
      cell: ({ row }) => (
        <div className="text-green-600 font-medium">
          {parseFloat(row.original.paidAmount).toLocaleString()} افغانی
        </div>
      ),
    },
    {
      accessorKey: "outstanding",
      header: "باقیمانده",
      cell: ({ row }) => (
        <div className="text-amber-600 font-medium">
          {parseFloat(row.original.outstanding).toLocaleString()} افغانی
        </div>
      ),
    },
    {
      accessorKey: "isFullyPaid",
      header: "وضعیت",
      cell: ({ row }) =>
        row.original.isFullyPaid ? (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 ml-1" />
            پرداخت کامل
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-600 text-amber-600">
            <AlertCircle className="h-3 w-3 ml-1" />
            بدهکار
          </Badge>
        ),
    },
    {
      accessorKey: "issuedBy",
      header: "صادر کننده",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.original.issuedBy || "نامشخص"}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {!row.original.isFullyPaid &&
            parseFloat(row.original.outstanding) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPaymentDialog(row.original)}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <CreditCard className="ml-2 h-3 w-3" />
                پرداخت
              </Button>
            )}
        </div>
      ),
    },
  ];

  // TanStack Table instance
  const table = useReactTable({
    data: salesData?.data || [],
    columns: salesColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const openPaymentDialog = (record: SaleRecord) => {
    setPaymentDialog({
      isOpen: true,
      saleId: record.id,
      customerName: record.customerName,
      partName: record.partName,
      outstandingAmount: record.outstanding,
    });
    setPaymentAmount(record.outstanding);
  };

  const openBulkPaymentDialog = (customer: any) => {
    if (customer.totalOutstanding <= 0) {
      alert("این مشتری هیچ بدهی ندارد");
      return;
    }

    setBulkPaymentDialog({
      isOpen: true,
      customerName: customer.customerName,
      normalizedName: customer.normalizedName,
      totalOutstanding: customer.totalOutstanding,
    });
    setBulkPaymentAmount(customer.totalOutstanding.toString());
  };

  const handleAddPayment = async () => {
    if (!paymentDialog.saleId || !paymentAmount) return;

    setIsProcessingPayment(true);
    try {
      const paymentData = {
        saleId: paymentDialog.saleId,
        amount: parseFloat(paymentAmount),
        note: paymentNote || undefined,
        receivedBy: null,
      };

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error("Payment failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      setPaymentDialog({
        isOpen: false,
        saleId: null,
        customerName: "",
        partName: "",
        outstandingAmount: "0",
      });
      setPaymentAmount("");
      setPaymentNote("");
      alert("پرداخت با موفقیت ثبت شد");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("خطا در ثبت پرداخت");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBulkPayment = async () => {
    if (!bulkPaymentDialog.normalizedName || !bulkPaymentAmount) return;

    // Validate amount
    const amount = parseFloat(bulkPaymentAmount);
    if (amount <= 0) {
      alert("مبلغ پرداخت باید بیشتر از صفر باشد");
      return;
    }

    setIsProcessingBulkPayment(true);
    try {
      const paymentData = {
        customerName: bulkPaymentDialog.customerName,
        normalizedName: bulkPaymentDialog.normalizedName,
        totalAmount: amount,
        note: bulkPaymentNote || undefined,
        receivedBy: null,
      };

      console.log("Sending bulk payment data:", paymentData);

      const response = await fetch("/api/payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      console.log("Bulk payment response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bulk payment error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("Bulk payment result:", result);

      if (result.processedPayments !== undefined) {
        await queryClient.invalidateQueries({ queryKey: ["sales"] });
        setBulkPaymentDialog({
          isOpen: false,
          customerName: "",
          normalizedName: "",
          totalOutstanding: 0,
        });
        setBulkPaymentAmount("");
        setBulkPaymentNote("");

        // Show success message with details
        let successMessage = `پرداخت انبوه با موفقیت ثبت شد.\n`;
        successMessage += `${result.processedPayments} پرداخت پردازش شد.\n`;
        successMessage += `مبلغ پرداختی: ${result.totalAmount.toLocaleString()} افغانی\n`;

        if (result.remainingAmount > 0) {
          successMessage += `مبلغ باقیمانده: ${result.remainingAmount.toLocaleString()} افغانی\n`;
          successMessage += `(مبلغ پرداختی بیشتر از بدهی بود)`;
        }

        alert(successMessage);
      } else {
        console.error("Bulk payment result missing processedPayments:", result);
        alert("خطا در ثبت پرداخت انبوه");
      }
    } catch (error) {
      console.error("Error processing bulk payment:", error);
      const message = error instanceof Error ? error.message : "خطای نامشخص";
      alert(`خطا در ثبت پرداخت انبوه: ${message}`);
    } finally {
      setIsProcessingBulkPayment(false);
    }
  };

  // Filter records for customer summary
  const filteredRecords =
    salesData?.data?.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.normalizedName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        record.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCustomer =
        !selectedCustomer || record.normalizedName === selectedCustomer;

      return matchesSearch && matchesCustomer;
    }) || [];

  // Customer summary calculation
  const customerSummary = filteredRecords.reduce(
    (acc, record) => {
      const key = record.normalizedName;
      if (!acc[key]) {
        acc[key] = {
          customerName: record.customerName,
          normalizedName: record.normalizedName,
          totalSales: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          salesCount: 0,
        };
      }
      acc[key].totalSales += parseFloat(record.totalAmount);
      acc[key].totalPaid += parseFloat(record.paidAmount);
      acc[key].totalOutstanding += parseFloat(record.outstanding);
      acc[key].salesCount += 1;
      return acc;
    },
    {} as Record<string, any>
  );

  const customerSummaryArray = Object.values(customerSummary);

  // Mobile Card Components
  const MobileSaleCard = ({ record }: { record: SaleRecord }) => (
    <Card className="mb-4 border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{record.customerName}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {record.partName}
            </div>
            {record.partNumber && (
              <div className="font-mono text-xs bg-primary/10 px-2 py-1 rounded inline-block">
                {record.partNumber}
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!record.isFullyPaid && parseFloat(record.outstanding) > 0 && (
                <DropdownMenuItem onClick={() => openPaymentDialog(record)}>
                  <CreditCard className="ml-2 h-4 w-4" />
                  ثبت پرداخت
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">تعداد</div>
            <div>{record.quantity}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">تاریخ</div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(record.issueDate).toLocaleDateString("fa-IR")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">مبلغ کل</div>
            <div className="font-medium">
              {parseFloat(record.totalAmount).toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">پرداخت شده</div>
            <div className="text-green-600 font-medium">
              {parseFloat(record.paidAmount).toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">باقیمانده</div>
            <div className="text-amber-600 font-medium">
              {parseFloat(record.outstanding).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div>
            {record.isFullyPaid ? (
              <Badge className="bg-green-600">
                <CheckCircle className="h-3 w-3 ml-1" />
                پرداخت کامل
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-600 text-amber-600"
              >
                <AlertCircle className="h-3 w-3 ml-1" />
                بدهکار
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            صادر کننده: <span>{record.issuedBy || "نامشخص"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Mobile Customer Card Component
  const MobileCustomerCard = ({
    customer,
    index,
  }: {
    customer: any;
    index: number;
  }) => (
    <Card
      className={`mb-4 border-border bg-card cursor-pointer transition-colors ${
        selectedCustomer === customer.normalizedName
          ? "ring-2 ring-primary"
          : ""
      }`}
      onClick={() => setSelectedCustomer(customer.normalizedName)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span
              className={`font-medium ${
                selectedCustomer === customer.normalizedName
                  ? "text-primary"
                  : ""
              }`}
            >
              {customer.customerName}
            </span>
            {selectedCustomer === customer.normalizedName && (
              <Badge
                variant="secondary"
                className="text-xs bg-primary text-primary-foreground"
              >
                انتخاب شده
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {customer.salesCount} فروش
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">کل فروش</div>
            <div className="font-medium">
              {customer.totalSales.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">پرداخت شده</div>
            <div className="text-green-600 font-medium">
              {customer.totalPaid.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">باقیمانده</div>
            <div className="text-amber-600 font-medium">
              {customer.totalOutstanding.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div>
            {customer.totalOutstanding <= 0 ? (
              <Badge className="bg-green-600">پرداخت کامل</Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-600 text-amber-600"
              >
                بدهکار
              </Badge>
            )}
          </div>
          {customer.totalOutstanding > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openBulkPaymentDialog(customer);
              }}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <CreditCard className="ml-2 h-3 w-3" />
              پرداخت همه
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            مدیریت فروش و پرداخت‌ها
          </h1>
          <p className="text-muted-foreground mt-2">
            نظارت بر فروش‌ها و مدیریت پرداخت‌های مشتریان
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
          {selectedCustomer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCustomer(null)}
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              نمایش همه مشتریان
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["sales"] })
            }
            disabled={isLoading || isFetching}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Package className="mr-2 h-4 w-4" />
            بارگذاری مجدد
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <Button
            variant={isMobile ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMobile(true)}
            className={`${isMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground"} px-3`}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant={!isMobile ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMobile(false)}
            className={`${!isMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground"} px-3`}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date Filter Section */}
      <Card className="border-mechanical shadow-sm">
        <CardHeader className="bg-mechanical/50 border-b border-border">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فیلتر تاریخ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Quick Date Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={datePeriod === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => applyDatePeriod("today")}
                className={
                  datePeriod === "today"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                امروز
              </Button>
              <Button
                variant={datePeriod === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => applyDatePeriod("week")}
                className={
                  datePeriod === "week"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                این هفته
              </Button>
              <Button
                variant={datePeriod === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => applyDatePeriod("month")}
                className={
                  datePeriod === "month"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                این ماه
              </Button>
              <Button
                variant={datePeriod === "lifetime" ? "default" : "outline"}
                size="sm"
                onClick={() => applyDatePeriod("lifetime")}
                className={
                  datePeriod === "lifetime"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                همه زمان
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">از:</label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">تا:</label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="w-32"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              کل فروش
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {filteredRecords
                .reduce((sum, r) => sum + parseFloat(r.totalAmount), 0)
                .toLocaleString()}{" "}
              افغانی
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              پرداخت شده
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredRecords
                .reduce((sum, r) => sum + parseFloat(r.paidAmount), 0)
                .toLocaleString()}{" "}
              افغانی
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              باقیمانده
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {filteredRecords
                .reduce((sum, r) => sum + parseFloat(r.outstanding), 0)
                .toLocaleString()}{" "}
              افغانی
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Summary */}
      <Card className="border-mechanical shadow-lg">
        <CardHeader className="bg-mechanical/50 border-b border-border">
          <CardTitle className="text-foreground">خلاصه مشتریان</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader
                title="در حال بارگذاری سوابق..."
                subtitle="لطفاً منتظر بمانید"
                size="sm"
              />
            </div>
          ) : customerSummaryArray.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ سابقه مشتری یافت نشد</p>
            </div>
          ) : isMobile ? (
            // Mobile Card View for Customers
            <div className="space-y-4">
              {customerSummaryArray.map((customer, idx) => (
                <MobileCustomerCard key={idx} customer={customer} index={idx} />
              ))}
            </div>
          ) : (
            // Desktop Table View for Customers
            <div className="rounded-md border border-border overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead>نام مشتری</TableHead>
                    <TableHead>تعداد فروش</TableHead>
                    <TableHead>کل فروش</TableHead>
                    <TableHead>پرداخت شده</TableHead>
                    <TableHead>باقیمانده</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerSummaryArray.map((customer, idx) => (
                    <TableRow
                      key={idx}
                      onClick={() =>
                        setSelectedCustomer(customer.normalizedName)
                      }
                      className={`group hover:bg-accent/30 border-border transition-colors cursor-pointer ${
                        selectedCustomer === customer.normalizedName
                          ? "bg-primary/10 border-primary/30"
                          : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={
                              selectedCustomer === customer.normalizedName
                                ? "text-primary font-semibold"
                                : "text-foreground"
                            }
                          >
                            {customer.customerName}
                          </span>
                          {selectedCustomer === customer.normalizedName && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-primary text-primary-foreground"
                            >
                              انتخاب شده
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {customer.salesCount}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.totalSales.toLocaleString()} افغانی
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {customer.totalPaid.toLocaleString()} افغانی
                      </TableCell>
                      <TableCell className="text-amber-600 font-medium">
                        {customer.totalOutstanding.toLocaleString()} افغانی
                      </TableCell>
                      <TableCell>
                        {customer.totalOutstanding <= 0 ? (
                          <Badge className="bg-green-600">پرداخت کامل</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-600 text-amber-600"
                          >
                            بدهکار
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {customer.totalOutstanding > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBulkPaymentDialog(customer);
                              }}
                              className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                              <CreditCard className="ml-2 h-3 w-3" />
                              پرداخت همه
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Table Section */}
      <Card className="border-mechanical shadow-lg">
        <CardHeader className="bg-mechanical/50 border-b border-border">
          <CardTitle className="text-foreground flex flex-col sm:flex-row sm:items-center gap-4">
            <span>جزئیات فروش</span>
            <Input
              placeholder="جستجو بر اساس نام مشتری، نام قطعه یا شماره قطعه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm border-border focus:border-primary focus:ring-primary/20"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded border border-destructive/50 mb-4">
              {(error as Error)?.message || "خطا در بارگذاری داده‌ها"}
            </div>
          )}

          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader
                title="در حال بارگذاری سوابق..."
                subtitle="لطفاً منتظر بمانید"
                size="sm"
              />
            </div>
          ) : !salesData?.data || salesData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ سابقه فروشی یافت نشد</p>
            </div>
          ) : isMobile ? (
            // Mobile Card View
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <MobileSaleCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
            // Desktop Table View with TanStack Table
            <>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="hover:bg-accent/30"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={salesColumns.length}
                          className="h-24 text-center"
                        >
                          هیچ نتیجه‌ای یافت نشد.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    صفحه {table.getState().pagination.pageIndex + 1} از{" "}
                    {table.getPageCount()}
                  </span>
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                    className="border rounded p-1"
                  >
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        نمایش {pageSize}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialog.isOpen}
        onOpenChange={(open) =>
          setPaymentDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-md border-mechanical bg-background">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              ثبت پرداخت
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <div className="bg-mechanical/50 p-3 rounded-lg border border-border">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">مشتری:</span>
                      <span className="font-medium text-foreground">
                        {paymentDialog.customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قطعه:</span>
                      <span className="font-medium text-foreground">
                        {paymentDialog.partName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        مبلغ قابل پرداخت:
                      </span>
                      <span className="font-bold text-amber-600">
                        {parseFloat(
                          paymentDialog.outstandingAmount
                        ).toLocaleString()}{" "}
                        افغانی
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    مبلغ پرداخت
                  </label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="مبلغ را وارد کنید"
                    step="0.01"
                    min="0"
                    max={paymentDialog.outstandingAmount}
                    className="text-right border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    یادداشت (اختیاری)
                  </label>
                  <Input
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="یادداشت اضافی"
                    className="text-right border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPaymentDialog({
                        isOpen: false,
                        saleId: null,
                        customerName: "",
                        partName: "",
                        outstandingAmount: "0",
                      })
                    }
                    className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    انصراف
                  </Button>
                  <Button
                    onClick={handleAddPayment}
                    disabled={
                      !paymentAmount ||
                      parseFloat(paymentAmount) <= 0 ||
                      isProcessingPayment
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        در حال پردازش...
                      </>
                    ) : (
                      <>
                        <CreditCard className="ml-2 h-4 w-4" />
                        ثبت پرداخت
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Dialog */}
      <Dialog
        open={bulkPaymentDialog.isOpen}
        onOpenChange={(open) =>
          setBulkPaymentDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-md border-mechanical bg-background">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              پرداخت انبوه - {bulkPaymentDialog.customerName}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <div className="bg-mechanical/50 p-3 rounded-lg border border-border">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">مشتری:</span>
                      <span className="font-medium text-foreground">
                        {bulkPaymentDialog.customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">مجموع بدهی:</span>
                      <span className="font-bold text-amber-600">
                        {bulkPaymentDialog.totalOutstanding.toLocaleString()}{" "}
                        افغانی
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    مبلغ پرداخت
                  </label>
                  <Input
                    type="number"
                    value={bulkPaymentAmount}
                    onChange={(e) => setBulkPaymentAmount(e.target.value)}
                    placeholder={`مبلغ تا ${bulkPaymentDialog.totalOutstanding.toLocaleString()} افغانی`}
                    step="0.01"
                    min="0"
                    max={bulkPaymentDialog.totalOutstanding}
                    className="text-right border-border focus:border-primary focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    می‌توانید مبلغی کمتر یا بیشتر از بدهی پرداخت کنید. مبلغ
                    اضافی برگشت داده می‌شود.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    یادداشت (اختیاری)
                  </label>
                  <Input
                    value={bulkPaymentNote}
                    onChange={(e) => setBulkPaymentNote(e.target.value)}
                    placeholder="یادداشت اضافی"
                    className="text-right border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setBulkPaymentDialog({
                        isOpen: false,
                        customerName: "",
                        normalizedName: "",
                        totalOutstanding: 0,
                      })
                    }
                    className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    انصراف
                  </Button>
                  <Button
                    onClick={handleBulkPayment}
                    disabled={
                      !bulkPaymentAmount ||
                      parseFloat(bulkPaymentAmount) <= 0 ||
                      isProcessingBulkPayment
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md"
                  >
                    {isProcessingBulkPayment ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        در حال پردازش...
                      </>
                    ) : (
                      <>
                        <CreditCard className="ml-2 h-4 w-4" />
                        ثبت پرداخت انبوه
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
