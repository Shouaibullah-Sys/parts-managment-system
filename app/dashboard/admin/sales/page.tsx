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
import { ExternalPayablesBreakdown } from "@/components/parts/external-payables-breakdown";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Printer,
  Coins,
  RotateCcw,
  Store,
  Wallet,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import Loader from "@/components/loader";
import HijriDatePicker from "@/components/hijri-date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import type { SalesPrintSummary } from "@/lib/sales-print";
import { exportCustomerSummaryExcel } from "@/lib/customer-summary-excel";
import type { CustomerSummaryData } from "@/components/sales/customer-summary-types";

interface SaleRecord {
  id: number;
  customerName: string;
  normalizedName: string;
  // قابل وصول خالص (پرزهٔ خارجی: فقط سود مغازه)
  totalAmount: string;
  grossAmount?: string;
  externalCost?: string;
  isExternal?: boolean;
  paidAmount: string;
  outstanding: string;
  discount: string;
  isFullyPaid: boolean;
  issueDate: string;
  quantity: number;
  issuedBy: string;
  partNumber: string;
  partName: string;
  itemCount: number;
  status: "completed" | "pending" | "approved";
  returnedAt: string | null;
  returnNote: string | null;
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
  summary?: SalesPrintSummary;
}

// Date period types
type DatePeriod = "today" | "week" | "month" | "lifetime" | "custom";

// Fetch sales data with React Query
const fetchSalesData = async ({
  page = 1,
  limit = 100,
  search = "",
  fromDate = "",
  toDate = "",
  period = "today",
  paymentStatus = "",
}: {
  page: number;
  limit: number;
  search: string;
  fromDate: string;
  toDate: string;
  period: DatePeriod;
  paymentStatus?: string;
}): Promise<SalesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
    ...(paymentStatus && paymentStatus !== "all" && { paymentStatus }),
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
  // وضعیت پرداخت toggle — "all" | "paid" | "outstanding"
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

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
        paymentStatus: paymentFilter,
      },
    ],
    queryFn: () =>
      fetchSalesData({
        page: 1,
        limit: 100,
        search: searchTerm,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        // "custom" means user picked an explicit range — API applies
        // only fromDate/toDate when period is "lifetime"
        period: datePeriod === "custom" ? "lifetime" : datePeriod,
        paymentStatus: paymentFilter,
      }),
  });

  // خلاصه مشتریان (تجمعی سرورساید — کامل و شامل تفکیک شرکا)
  const summaryQueryParams = (): URLSearchParams => {
    const params = new URLSearchParams({
      period: datePeriod === "custom" ? "lifetime" : datePeriod,
    });
    if (datePeriod === "custom") {
      if (dateRange.from) params.set("fromDate", dateRange.from);
      if (dateRange.to) params.set("toDate", dateRange.to);
    }
    if (paymentFilter && paymentFilter !== "all")
      params.set("paymentStatus", paymentFilter);
    if (searchTerm) params.set("search", searchTerm);
    return params;
  };

  const { data: customerSummaryData } = useQuery({
    queryKey: [
      "customer-summary",
      {
        search: searchTerm,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        period: datePeriod,
        paymentStatus: paymentFilter,
      },
    ],
    queryFn: async (): Promise<CustomerSummaryData> => {
      const res = await fetch(
        `/api/sales/customer-summary?${summaryQueryParams().toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch customer summary");
      const json = await res.json();
      return json.data as CustomerSummaryData;
    },
  });

  const [summaryExporting, setSummaryExporting] = useState(false);

  const handleSummaryExcel = async () => {
    if (!customerSummaryData) return;
    setSummaryExporting(true);
    try {
      await exportCustomerSummaryExcel(customerSummaryData, {
        period: datePeriod === "custom" ? "lifetime" : datePeriod,
        from: dateRange.from,
        to: dateRange.to,
        paymentStatus: paymentFilter,
        search: searchTerm,
      });
    } catch (error) {
      console.error("Error exporting customer summary Excel:", error);
      alert("خطا در تولید فایل اکسل");
    } finally {
      setSummaryExporting(false);
    }
  };

  const handleSummaryPdf = async () => {
    const qs = summaryQueryParams().toString();
    const filename = `customer-summary-${dateRange.from || "all"}_${dateRange.to || "all"}.pdf`;

    // تب جدید مستقیماً به خود PDF باز می‌شود (بدون blob → مطمئن‌تر)
    window.open(`/api/sales/customer-summary/pdf?${qs}&inline=1`, "_blank");

    setSummaryExporting(true);
    try {
      const res = await fetch(`/api/sales/customer-summary/pdf?${qs}`);
      if (!res.ok) throw new Error("failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("Error exporting customer summary PDF:", error);
      alert("خطا در تولید فایل PDF");
    } finally {
      setSummaryExporting(false);
    }
  };

  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState<{
    isOpen: boolean;
    saleId: number | null;
    customerName: string;
    partName: string;
    outstandingAmount: string;
    totalAmount: string;
    paidAmount: string;
    discount: string;
  }>({
    isOpen: false,
    saleId: null,
    customerName: "",
    partName: "",
    outstandingAmount: "0",
    totalAmount: "0",
    paidAmount: "0",
    discount: "0",
  });

  // Payment + discount history inside the payment dialog
  const [paymentHistory, setPaymentHistory] = useState<{
    isLoading: boolean;
    initialPaid: number;
    rows: {
      id: number;
      amount: string;
      paymentDate: string | null;
      note: string | null;
      receivedBy: string | null;
    }[];
    discounts: {
      id: number;
      amount: string;
      createdAt: string | null;
      note: string | null;
      createdBy: string | null;
    }[];
  }>({ isLoading: false, initialPaid: 0, rows: [], discounts: [] });

  const [discountAmount, setDiscountAmount] = useState("");
  const [discountNote, setDiscountNote] = useState("");

  // Refund Dialog State
  const [refundDialog, setRefundDialog] = useState<{
    isOpen: boolean;
    saleId: number | null;
    customerName: string;
    partName: string;
    paidAmount: string;
  }>({
    isOpen: false,
    saleId: null,
    customerName: "",
    partName: "",
    paidAmount: "0",
  });
  const [returnRestoreStock, setReturnRestoreStock] = useState(true);
  const [refundNote, setRefundNote] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

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

  // Print report dialog
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printRange, setPrintRange] = useState({
    from: format(startOfToday(), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  // Per-report filters inside the print dialog (prefilled from the page's
  // active وضعیت پرداخت filter, but adjustable for this report only)
  const [printPayment, setPrintPayment] = useState<string>("all");

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

  // Manual date pick switches to an explicit custom range so the API
  // filters only by fromDate/toDate (period "today/week/month" would be ANDed)
  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    setDateRange((prev) => {
      const next = { ...prev, [field]: value };
      // keep the range valid: swap if from > to
      if (next.from && next.to && next.from > next.to) {
        return { from: next.to, to: next.from };
      }
      return next;
    });
    setDatePeriod("custom");
  };

  // --- Print report ---
  const openPrintDialog = () => {
    // prefill from the active filter; fall back to current month
    setPrintRange({
      from: dateRange.from || format(startOfMonth(new Date()), "yyyy-MM-dd"),
      to: dateRange.to || format(new Date(), "yyyy-MM-dd"),
    });
    // prefill وضعیت پرداخت from the page's active filters
    setPrintPayment(paymentFilter);
    setPrintDialogOpen(true);
  };

  const handlePrintRangeChange = (field: "from" | "to", value: string) => {
    setPrintRange((prev) => {
      const next = { ...prev, [field]: value };
      if (next.from && next.to && next.from > next.to) {
        return { from: next.to, to: next.from };
      }
      return next;
    });
  };

  const handlePrintReport = () => {
    if (!printRange.from || !printRange.to) {
      alert("لطفاً تاریخ شروع و ختم را انتخاب کنید");
      return;
    }
    const params = new URLSearchParams({
      fromDate: printRange.from,
      toDate: printRange.to,
    });
    if (printPayment !== "all") params.set("paymentStatus", printPayment);
    if (searchTerm) params.set("search", searchTerm);
    // فقط نمایش PDF در تب جدید (بدون دانلود)
    window.open(`/api/sales/report/pdf?${params.toString()}&inline=1`, "_blank");
    setPrintDialogOpen(false);
  };

  // راپور مرجوعیات در همان بازه تاریخ
  const handlePrintReturns = () => {
    if (!printRange.from || !printRange.to) {
      alert("لطفاً تاریخ شروع و ختم را انتخاب کنید");
      return;
    }
    const params = new URLSearchParams({
      fromDate: printRange.from,
      toDate: printRange.to,
    });
    window.open(
      `/api/sales/returns-report/pdf?${params.toString()}&inline=1`,
      "_blank",
    );
    setPrintDialogOpen(false);
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
          <div className="flex items-center gap-2 font-medium text-foreground">
            {row.original.partName}
            {row.original.isExternal && (
              <Badge className="bg-amber-500 text-xs text-white hover:bg-amber-500">
                <Store className="ml-1 h-3 w-3" />
                خارجی
              </Badge>
            )}
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
      header: "مبلغ قابل وصول",
      cell: ({ row }) => (
        <div className="font-medium">
          {parseFloat(row.original.totalAmount).toLocaleString()} افغانی
          {row.original.isExternal && (
            <div className="text-xs font-normal text-amber-600">
              سود مغازه از فروش{" "}
              {parseFloat(row.original.grossAmount || "0").toLocaleString()}
            </div>
          )}
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
        row.original.returnedAt ? (
          <Badge className="bg-rose-600">
            <RotateCcw className="h-3 w-3 ml-1" />
            مرجوع‌شده
          </Badge>
        ) : row.original.isFullyPaid ? (
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
          {!row.original.returnedAt &&
            !row.original.isFullyPaid &&
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
          {!row.original.returnedAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRefundDialog(row.original)}
              className="border-rose-400 text-rose-600 hover:bg-rose-50"
            >
              <RotateCcw className="ml-2 h-3 w-3" />
              مرجوعی
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

  const fetchPaymentHistory = async (saleId: number) => {
    setPaymentHistory((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`/api/payments?saleId=${saleId}`);
      if (res.ok) {
        const json = await res.json();
        setPaymentHistory({
          isLoading: false,
          initialPaid: json.initialPaid || 0,
          rows: json.data || [],
          discounts: json.discounts || [],
        });
      } else {
        setPaymentHistory({
          isLoading: false,
          initialPaid: 0,
          rows: [],
          discounts: [],
        });
      }
    } catch {
      setPaymentHistory({
        isLoading: false,
        initialPaid: 0,
        rows: [],
        discounts: [],
      });
    }
  };

  const openPaymentDialog = (record: SaleRecord) => {
    setPaymentDialog({
      isOpen: true,
      saleId: record.id,
      customerName: record.customerName,
      partName: record.partName,
      outstandingAmount: record.outstanding,
      totalAmount: record.totalAmount,
      paidAmount: record.paidAmount,
      discount: record.discount || "0",
    });
    setPaymentAmount(record.outstanding);
    setPaymentNote("");
    setDiscountAmount("");
    setDiscountNote("");
    fetchPaymentHistory(record.id);
  };

  // رویدادهای ترکیبی سوابق (پرداخت + تخفیف) — جدیدترین اول
  const paymentHistoryEvents = [
    ...paymentHistory.rows.map((row) => ({
      key: `p${row.id}`,
      type: "payment" as const,
      amount: row.amount,
      date: row.paymentDate,
      note: row.note,
      who: row.receivedBy,
    })),
    ...paymentHistory.discounts.map((row) => ({
      key: `d${row.id}`,
      type: "discount" as const,
      amount: row.amount,
      date: row.createdAt,
      note: row.note,
      who: row.createdBy,
    })),
  ].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );

  // مقادیر لحظه‌ای دیالوگ پرداخت
  const dialogOutstanding = parseFloat(paymentDialog.outstandingAmount) || 0;
  const dialogDiscountInput = parseFloat(discountAmount) || 0;
  const maxPaymentAfterDiscount = Math.max(
    0,
    dialogOutstanding - dialogDiscountInput,
  );

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

  // چاپ/نمایش راپور انفرادی هر مشتری به صورت PDF در تب جدید (بدون دانلود)
  const openCustomerReport = (customer: {
    customerId: number | null;
    customerName: string;
    normalizedName: string;
  }) => {
    const params = new URLSearchParams({
      period: datePeriod === "custom" ? "lifetime" : datePeriod,
    });
    if (datePeriod === "custom") {
      if (dateRange.from) params.set("fromDate", dateRange.from);
      if (dateRange.to) params.set("toDate", dateRange.to);
    }
    if (paymentFilter && paymentFilter !== "all")
      params.set("paymentStatus", paymentFilter);
    if (searchTerm) params.set("search", searchTerm);
    if (customer.customerId != null)
      params.set("customerId", String(customer.customerId));
    else if (customer.normalizedName)
      params.set("normalizedName", customer.normalizedName);

    window.open(
      `/api/sales/customer-summary/detail/pdf?${params.toString()}&inline=1`,
      "_blank",
    );
  };

  const handleAddPayment = async () => {
    if (!paymentDialog.saleId) return;

    const pay = parseFloat(paymentAmount) || 0;
    const disc = parseFloat(discountAmount) || 0;

    if (pay <= 0 && disc <= 0) {
      alert("مبلغ پرداخت یا مبلغ تخفیف را وارد کنید");
      return;
    }

    const outstanding = parseFloat(paymentDialog.outstandingAmount);
    if (disc > outstanding + 1e-9) {
      alert(
        `مبلغ تخفیف نمی‌تواند بیشتر از باقیمانده (${outstanding.toLocaleString()} افغانی) باشد`,
      );
      return;
    }
    if (pay > outstanding - disc + 1e-9) {
      alert(
        `مبلغ پرداخت نمی‌تواند بیشتر از باقیمانده پس از تخفیف (${(outstanding - disc).toLocaleString()} افغانی) باشد`,
      );
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch("/api/sales/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: paymentDialog.saleId,
          paymentAmount: pay > 0 ? pay : undefined,
          discountAmount: disc > 0 ? disc : undefined,
          paymentNote: paymentNote || undefined,
          discountNote: discountNote || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          typeof body?.error === "string" ? body.error : "Payment failed";
        throw new Error(message);
      }

      const result = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      setPaymentDialog({
        isOpen: false,
        saleId: null,
        customerName: "",
        partName: "",
        outstandingAmount: "0",
        totalAmount: "0",
        paidAmount: "0",
        discount: "0",
      });
      setPaymentAmount("");
      setPaymentNote("");
      setDiscountAmount("");
      setDiscountNote("");
      alert(
        result.discountApplied > 0
          ? "پرداخت و تخفیف با موفقیت اعمال شد"
          : "پرداخت با موفقیت ثبت شد",
      );
    } catch (error) {
      console.error("Error processing payment:", error);
      const message =
        error instanceof Error && error.message !== "Payment failed"
          ? error.message
          : "خطا در ثبت پرداخت";
      alert(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const closeRefundDialog = () => {
    setRefundDialog({
      isOpen: false,
      saleId: null,
      customerName: "",
      partName: "",
      paidAmount: "0",
    });
    setReturnRestoreStock(true);
    setRefundNote("");
  };

  const openRefundDialog = (record: SaleRecord) => {
    if (record.returnedAt) {
      alert("این فروش قبلاً مرجوع شده است");
      return;
    }
    setRefundDialog({
      isOpen: true,
      saleId: record.id,
      customerName: record.customerName,
      partName: record.partName,
      paidAmount: record.paidAmount,
    });
    setReturnRestoreStock(true);
    setRefundNote("");
  };

  const handleRefund = async () => {
    if (!refundDialog.saleId) return;

    const paid = parseFloat(refundDialog.paidAmount) || 0;

    setIsProcessingRefund(true);
    try {
      const response = await fetch("/api/sales/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: refundDialog.saleId,
          restoreStock: returnRestoreStock,
          note: refundNote || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          typeof body?.error === "string" ? body.error : "Return failed";
        throw new Error(message);
      }

      const result = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      closeRefundDialog();
      const partsMsg: string[] = [];
      if (result.stockRestored) partsMsg.push("کالا به انبار برگشت");
      if (paid > 0) partsMsg.push(`بازپرداخت ${paid.toLocaleString()} افغانی`);
      alert(
        partsMsg.length > 0
          ? `مرجوعی ثبت شد — ${partsMsg.join("، ")}`
          : "مرجوعی فروش ثبت شد",
      );
    } catch (error) {
      console.error("Error processing return:", error);
      const message =
        error instanceof Error && error.message !== "Return failed"
          ? error.message
          : "خطا در ثبت مرجوعی";
      alert(message);
    } finally {
      setIsProcessingRefund(false);
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

  // خلاصه مشتریان از سرور (تجمعی و کامل — شامل شرکا)
  // فروش‌های مرتجع در این گزارش لحاظ نمی‌شوند (در سمت سرور فیلتر شده‌اند)
  const customerSummaryArray = (customerSummaryData?.customers ?? [])
    .filter((c) => !selectedCustomer || c.normalizedName === selectedCustomer)
    .map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      normalizedName: c.normalizedName ?? "",
      totalSales: c.netSales,
      totalPaid: c.paid,
      totalOutstanding: c.outstanding,
      salesCount: c.salesCount,
      partners: c.partners,
    }));

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
              {!record.returnedAt &&
                !record.isFullyPaid &&
                parseFloat(record.outstanding) > 0 && (
                  <DropdownMenuItem onClick={() => openPaymentDialog(record)}>
                    <CreditCard className="ml-2 h-4 w-4" />
                    ثبت پرداخت
                  </DropdownMenuItem>
                )}
              {!record.returnedAt && (
                <DropdownMenuItem onClick={() => openRefundDialog(record)}>
                  <RotateCcw className="ml-2 h-4 w-4" />
                  مرجوعی
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
            {record.returnedAt ? (
              <Badge className="bg-rose-600">
                <RotateCcw className="h-3 w-3 ml-1" />
                مرجوع‌شده
              </Badge>
            ) : record.isFullyPaid ? (
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

        {customer.partners?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="text-muted-foreground">شرکا:</span>
            {customer.partners.map((p: string) => (
              <Badge key={p} variant="outline" className="text-xs">
                {p}
              </Badge>
            ))}
          </div>
        )}

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openCustomerReport(customer);
              }}
              className="border-border text-foreground hover:bg-accent"
            >
              <Printer className="ml-2 h-3 w-3" />
              چاپ راپور
            </Button>
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
          <Button
            variant="outline"
            size="sm"
            onClick={openPrintDialog}
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            راپور
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

            {/* Custom Date Range (Hijri / Solar Hijri picker) */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">از:</label>
                <HijriDatePicker
                  value={dateRange.from}
                  onChange={(v) => handleCustomDateChange("from", v)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">تا:</label>
                <HijriDatePicker
                  value={dateRange.to}
                  onChange={(v) => handleCustomDateChange("to", v)}
                />
              </div>
            </div>
          </div>

          {/* Payment Status filter */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4 border-t border-border">
            {/* Payment status toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                وضعیت پرداخت:
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  variant={paymentFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPaymentFilter("all")}
                  className={
                    paymentFilter === "all"
                      ? "bg-primary text-primary-foreground rounded-none"
                      : "rounded-none"
                  }
                >
                  همه
                </Button>
                <Button
                  variant={paymentFilter === "paid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPaymentFilter("paid")}
                  className={
                    paymentFilter === "paid"
                      ? "bg-green-600 text-white rounded-none"
                      : "rounded-none"
                  }
                >
                  <CheckCircle className="ml-1 h-3 w-3" />
                  پرداخت شده
                </Button>
                <Button
                  variant={paymentFilter === "outstanding" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPaymentFilter("outstanding")}
                  className={
                    paymentFilter === "outstanding"
                      ? "bg-amber-600 text-white rounded-none"
                      : "rounded-none"
                  }
                >
                  <AlertCircle className="ml-1 h-3 w-3" />
                  باقیمانده
                </Button>
              </div>
            </div>

            {/* Clear payment filters */}
            {paymentFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentFilter("all");
                }}
                className="text-sm text-primary hover:text-primary/80 self-start"
              >
                پاک کردن فیلترها
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              مجموع فروش (ناخالص)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(salesData?.summary?.grossSales ??
                filteredRecords.reduce(
                  (sum, r) => sum + parseFloat(r.grossAmount ?? r.totalAmount),
                  0
                )
              ).toLocaleString()}{" "}
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
              {(salesData?.summary?.totalPaid ??
                filteredRecords.reduce(
                  (sum, r) => sum + parseFloat(r.paidAmount),
                  0
                )
              ).toLocaleString()}{" "}
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
              {(salesData?.summary?.totalOutstanding ??
                filteredRecords.reduce(
                  (sum, r) => sum + parseFloat(r.outstanding),
                  0
                )
              ).toLocaleString()}{" "}
              افغانی
            </div>
          </CardContent>
        </Card>

        {/* کارت مجموع بازپرداخت/مرجوعی */}
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              مجموع بازپرداخت (مرجوعی)
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {(salesData?.summary?.totalRefunds ?? 0).toLocaleString()}{" "}
              افغانی
            </div>
            {salesData?.summary?.refundCount ? (
              <p className="text-xs text-muted-foreground mt-1">
                {salesData.summary.refundCount.toLocaleString("fa-IR")} مرجوعی
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* کارت قابل پرداخت به فروشگاه‌های خارجی */}
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              قابل پرداخت به فروشگاه‌ها
            </CardTitle>
            <Store className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {(salesData?.summary?.externalPayable ?? 0).toLocaleString()}{" "}
              افغانی
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              بهای خرید پرزه‌های خارجی
            </p>
          </CardContent>
        </Card>

        {/* کارت درآمد خالص (کل فروش − قابل پرداخت) */}
        <Card className="bg-mechanical border-mechanical shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              درآمد خالص
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {(salesData?.summary?.netSales ?? 0).toLocaleString()} افغانی
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              کل فروش منهای قابل پرداخت به فروشگاه‌ها
            </p>
          </CardContent>
        </Card>
      </div>

      {/* تفکیک قابل پرداخت به فروشگاه‌ها */}
      <ExternalPayablesBreakdown
        from={dateRange.from}
        to={dateRange.to}
        period={datePeriod === "custom" ? "lifetime" : datePeriod}
      />

      {/* Customer Summary */}
      <Card className="border-mechanical shadow-lg">
        <CardHeader className="bg-mechanical/50 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-foreground">خلاصه مشتریان</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummaryExcel}
                disabled={!customerSummaryData || summaryExporting}
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                {summaryExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                اکسل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummaryPdf}
                disabled={!customerSummaryData || summaryExporting}
                className="border-rose-500 text-rose-600 hover:bg-rose-50"
              >
                {summaryExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </div>
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
                    <TableHead>شرکا</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.partners.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {customer.partners.map((p) => (
                              <Badge
                                key={p}
                                variant="outline"
                                className="text-xs"
                              >
                                {p}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "بدون شراکت"
                        )}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCustomerReport(customer);
                            }}
                            className="border-border text-foreground hover:bg-accent"
                            title="چاپ راپور انفرادی این مشتری (PDF در تب جدید)"
                          >
                            <Printer className="ml-2 h-3 w-3" />
                            چاپ راپور
                          </Button>
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
                              header.getContext(),
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
                                cell.getContext(),
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
                      <span className="text-muted-foreground">مجموع فروش:</span>
                      <span className="font-medium text-foreground">
                        {parseFloat(paymentDialog.totalAmount).toLocaleString()}{" "}
                        افغانی
                      </span>
                    </div>
                    {parseFloat(paymentDialog.discount || "0") > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          تخفیف داده‌شده:
                        </span>
                        <span className="font-medium text-rose-600">
                          {parseFloat(paymentDialog.discount).toLocaleString()}{" "}
                          افغانی
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">پرداخت‌شده:</span>
                      <span className="font-medium text-green-600">
                        {parseFloat(paymentDialog.paidAmount).toLocaleString()}{" "}
                        افغانی
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">باقیمانده:</span>
                      <span className="font-bold text-amber-600">
                        {parseFloat(
                          paymentDialog.outstandingAmount,
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
                    max={maxPaymentAfterDiscount}
                    className="text-right border-border focus:border-primary focus:ring-primary/20"
                  />
                  {dialogOutstanding > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaymentAmount(String(maxPaymentAfterDiscount))
                      }
                      className="w-full border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Coins className="ml-2 h-3.5 w-3.5" />
                      پرداخت باقیمانده (
                      {maxPaymentAfterDiscount.toLocaleString()} افغانی)
                    </Button>
                  )}
                  {(dialogDiscountInput > 0 ||
                    (parseFloat(paymentAmount) || 0) > 0) && (
                    <div className="flex items-center justify-between gap-2 text-xs bg-accent/40 rounded px-2 py-1.5 border border-dashed border-border">
                      <span className="text-muted-foreground">
                        پس از این پرداخت، باقیمانده:
                      </span>
                      <span
                        className={`font-semibold ${
                          Math.max(
                            0,
                            dialogOutstanding -
                              dialogDiscountInput -
                              (parseFloat(paymentAmount) || 0),
                          ) > 0
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      >
                        {Math.max(
                          0,
                          dialogOutstanding -
                            dialogDiscountInput -
                            (parseFloat(paymentAmount) || 0),
                        ).toLocaleString()}{" "}
                        افغانی
                        {Math.max(
                          0,
                          dialogOutstanding -
                            dialogDiscountInput -
                            (parseFloat(paymentAmount) || 0),
                        ) <= 0
                          ? " — تسویه کامل"
                          : " (بعداً قابل پرداخت)"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-2">
                  <label className="text-sm font-medium text-foreground">
                    تخفیف / بخشش بدهی (اختیاری — مبلغ به افغانی)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    در صورت تمایل وارد کنید؛ همراه با «ثبت پرداخت» اعمال می‌شود
                    و جزو درآمد نیست
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => {
                        const d = e.target.value;
                        setDiscountAmount(d);
                        // When discount increases, clamp the (pre-filled) payment
                        // down to the new remaining so submit never stays blocked.
                        const newMax = Math.max(
                          0,
                          dialogOutstanding - (parseFloat(d) || 0),
                        );
                        const currentPay = parseFloat(paymentAmount) || 0;
                        if (currentPay > newMax + 1e-9) {
                          setPaymentAmount(
                            newMax > 0 ? String(newMax) : "",
                          );
                        }
                      }}
                      placeholder="مبلغ تخفیف به افغانی"
                      step="0.01"
                      min="0"
                      max={dialogOutstanding}
                      className="text-right border-border focus:border-rose-500 focus:ring-rose-500/20"
                    />
                    <Input
                      value={discountNote}
                      onChange={(e) => setDiscountNote(e.target.value)}
                      placeholder="یادداشت (اختیاری)"
                      className="text-right border-border focus:border-rose-500 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    سوابق پرداخت و تخفیف
                  </label>
                  {paymentHistory.isLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      در حال بارگذاری سوابق...
                    </p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {paymentHistoryEvents.map((ev) => (
                        <div
                          key={ev.key}
                          className="flex items-center justify-between gap-2 text-xs bg-accent/40 rounded px-2 py-1.5"
                        >
                          <div className="flex flex-col">
                            <span
                              className={
                                ev.type === "discount" ||
                                (ev.type === "payment" && Number(ev.amount) < 0)
                                  ? "font-medium text-rose-600"
                                  : "font-medium text-green-600"
                              }
                            >
                              {ev.type === "discount"
                                ? "تخفیف − "
                                : ev.type === "payment" && Number(ev.amount) < 0
                                  ? "بازپرداخت − "
                                  : ""}
                              {Math.abs(Number(ev.amount)).toLocaleString()}{" "}
                              افغانی
                            </span>
                            <span className="text-muted-foreground">
                              {ev.date
                                ? new Date(ev.date).toLocaleDateString("fa-IR")
                                : ""}
                              {ev.who ? ` — ${ev.who}` : ""}
                            </span>
                          </div>
                          {ev.note && (
                            <span
                              className="text-muted-foreground truncate max-w-[110px]"
                              title={ev.note}
                            >
                              {ev.note}
                            </span>
                          )}
                        </div>
                      ))}
                      {paymentHistoryEvents.length === 0 &&
                        paymentHistory.initialPaid <= 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            هنوز پرداختی ثبت نشده است
                          </p>
                        )}
                      {paymentHistory.initialPaid > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs bg-accent/40 rounded px-2 py-1.5 border border-dashed border-border">
                          <div className="flex flex-col">
                            <span className="font-medium text-green-600">
                              {paymentHistory.initialPaid.toLocaleString()}{" "}
                              افغانی
                            </span>
                            <span className="text-muted-foreground">
                              پرداخت اولیه (هنگام ثبت فروش)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                        totalAmount: "0",
                        paidAmount: "0",
                        discount: "0",
                      })
                    }
                    className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    انصراف
                  </Button>
                  <Button
                    onClick={handleAddPayment}
                    disabled={
                      isProcessingPayment ||
                      ((parseFloat(paymentAmount) || 0) <= 0 &&
                        (parseFloat(discountAmount) || 0) <= 0) ||
                      dialogDiscountInput > dialogOutstanding + 1e-9 ||
                      (parseFloat(paymentAmount) || 0) >
                        maxPaymentAfterDiscount + 1e-9
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

      {/* Return (مرجوعی) Dialog */}
      <Dialog
        open={refundDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) closeRefundDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              مرجوعی فروش (برگشت کالا)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              کالا به انبار برگشت داده می‌شود و پول پرداخت‌شده به مشتری
              بازپرداخت می‌گردد — فروش از درآمد و گزارش‌ها خارج می‌شود
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-accent/40 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">مشتری:</span>
                <span className="font-medium text-foreground">
                  {refundDialog.customerName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">قطعه:</span>
                <span className="font-medium text-foreground">
                  {refundDialog.partName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
                <span className="text-muted-foreground">مبلغ بازپرداختی:</span>
                <span className="font-bold text-rose-600">
                  {(parseFloat(refundDialog.paidAmount) || 0).toLocaleString()}{" "}
                  افغانی
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={returnRestoreStock}
                onCheckedChange={(v) => setReturnRestoreStock(v === true)}
              />
              <span className="text-sm text-foreground">
                برگشت کالا به انبار (افزایش موجودی)
              </span>
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                یادداشت (اختیاری)
              </label>
              <Input
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="دلیل مرجوعی"
                className="text-right border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={closeRefundDialog}
                className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                انصراف
              </Button>
              <Button
                onClick={handleRefund}
                disabled={isProcessingRefund}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                {isProcessingRefund ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  <>
                    <RotateCcw className="ml-2 h-4 w-4" />
                    ثبت مرجوعی
                  </>
                )}
              </Button>
            </div>
          </div>
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

      {/* Print Report Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-md border-mechanical bg-background">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              راپور فروش
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  بازه زمانی و فیلترها را انتخاب کنید و راپور در تب جدید باز می‌شود
                </p>
                {searchTerm && (
                  <p className="text-center text-xs text-primary">
                    جستجوی فعال صفحه «{searchTerm}» نیز در راپور اعمال می‌شود
                  </p>
                )}

                <div className="bg-mechanical/50 p-3 rounded-lg border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-8">
                      از:
                    </label>
                    <HijriDatePicker
                      value={printRange.from}
                      onChange={(v) => handlePrintRangeChange("from", v)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-8">
                      تا:
                    </label>
                    <HijriDatePicker
                      value={printRange.to}
                      onChange={(v) => handlePrintRangeChange("to", v)}
                    />
                  </div>
                </div>

                {/* وضعیت پرداخت — فیلتر اختیاری راپور */}
                <div className="bg-mechanical/50 p-3 rounded-lg border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-12">
                      پرداخت:
                    </label>
                    <div className="flex flex-1 rounded-lg border border-border overflow-hidden">
                      <Button
                        variant={printPayment === "all" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPrintPayment("all")}
                        className={
                          printPayment === "all"
                            ? "bg-primary text-primary-foreground rounded-none flex-1"
                            : "rounded-none flex-1"
                        }
                      >
                        همه
                      </Button>
                      <Button
                        variant={
                          printPayment === "paid" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setPrintPayment("paid")}
                        className={
                          printPayment === "paid"
                            ? "bg-green-600 text-white rounded-none flex-1"
                            : "rounded-none flex-1"
                        }
                      >
                        <CheckCircle className="ml-1 h-3 w-3" />
                        پرداخت شده
                      </Button>
                      <Button
                        variant={
                          printPayment === "outstanding" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setPrintPayment("outstanding")}
                        className={
                          printPayment === "outstanding"
                            ? "bg-amber-600 text-white rounded-none flex-1"
                            : "rounded-none flex-1"
                        }
                      >
                        <AlertCircle className="ml-1 h-3 w-3" />
                        باقیمانده
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handlePrintReport}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <FileText className="ml-2 h-4 w-4" />
                    چاپ راپور فروش
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintReturns}
                    className="flex-1 border-rose-400 text-rose-600 hover:bg-rose-50"
                  >
                    <RotateCcw className="ml-2 h-4 w-4" />
                    چاپ راپور مرجوعیات
                  </Button>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setPrintDialogOpen(false)}
                    className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    انصراف
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
