// app/dashboard/admin/sales/page.tsx
"use client";

import { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "lucide-react";

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

export default function AdminSalesPage() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
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
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchSalesRecords(1, 100);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSalesRecords(1, 100);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchSalesRecords = async (page = 1, limit = 100) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/parts/records?page=${page}&limit=${limit}${
          searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""
        }`
      );
      const result = await response.json();

      if (result.success) {
        setRecords(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError("خطا در بارگذاری سوابق فروش");
      }
    } catch (error) {
      console.error("Error fetching sales records:", error);
      setError("خطا در اتصال به سرور");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAll = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/parts/records?limit=10000`);
      const result = await response.json();

      if (result.success) {
        setRecords(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError("خطا در بارگذاری همه سوابق");
      }
    } catch (error) {
      console.error("Error fetching all records:", error);
      setError("خطا در اتصال به سرور");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentDialog.saleId || !paymentAmount) return;

    setIsProcessingPayment(true);
    try {
      const paymentData = {
        saleId: paymentDialog.saleId,
        amount: parseFloat(paymentAmount),
        note: paymentNote || undefined,
        receivedBy: null, // Admin user ID can be added here if needed
      };

      console.log("Sending payment data:", paymentData);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      console.log("Payment response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Payment error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("Payment result:", result);

      if (result.newPaid !== undefined) {
        // Refresh records to show updated payment info
        await fetchSalesRecords(1, 100);
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
      } else {
        console.error("Payment result missing newPaid:", result);
        alert("خطا در ثبت پرداخت");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      const message = error instanceof Error ? error.message : "خطای نامشخص";
      alert(`خطا در ثبت پرداخت: ${message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openPaymentDialog = (record: SaleRecord) => {
    setPaymentDialog({
      isOpen: true,
      saleId: record.id,
      customerName: record.customerName,
      partName: record.partName,
      outstandingAmount: record.outstanding,
    });
    setPaymentAmount(record.outstanding); // Pre-fill with outstanding amount
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.normalizedName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCustomer =
      !selectedCustomer || record.normalizedName === selectedCustomer;

    return matchesSearch && matchesCustomer;
  });

  // Group by normalized customer name to show total per customer
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
            onClick={handleLoadAll}
            disabled={isLoading}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Package className="mr-2 h-4 w-4" />
            بارگذاری همه سوابق
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
            <div className="text-center py-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال بارگذاری سوابق...
            </div>
          ) : customerSummaryArray.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ سابقه مشتری یافت نشد</p>
            </div>
          ) : (
            <div
              className={`rounded-md border border-border ${isMobile ? "overflow-x-auto" : ""}`}
            >
              <Table className={isMobile ? "min-w-full" : "w-full"}>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      نام مشتری
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      تعداد فروش
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      کل فروش
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      پرداخت شده
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      باقیمانده
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      وضعیت
                    </TableHead>
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
                      <TableCell
                        className={`font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
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
                      <TableCell
                        className={`text-center ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {customer.salesCount}
                      </TableCell>
                      <TableCell
                        className={`font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {customer.totalSales.toLocaleString()} افغانی
                      </TableCell>
                      <TableCell
                        className={`text-green-600 font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {customer.totalPaid.toLocaleString()} افغانی
                      </TableCell>
                      <TableCell
                        className={`text-amber-600 font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {customer.totalOutstanding.toLocaleString()} افغانی
                      </TableCell>
                      <TableCell className={isMobile ? "px-3 py-3" : ""}>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Sales Records */}
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
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال بارگذاری سوابق...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ سابقه فروشی یافت نشد</p>
            </div>
          ) : (
            <div
              className={`rounded-md border border-border ${isMobile ? "overflow-x-auto" : ""}`}
            >
              <Table className={isMobile ? "min-w-full" : "w-full"}>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      مشتری
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      قطعه
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      تعداد
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      تاریخ
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      مبلغ کل
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      پرداخت شده
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      باقیمانده
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      وضعیت
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      صادر کننده
                    </TableHead>
                    <TableHead className={isMobile ? "px-3 py-2" : ""}>
                      عملیات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="group hover:bg-accent/30 border-border transition-colors"
                    >
                      <TableCell
                        className={`font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {record.customerName}
                        </div>
                      </TableCell>
                      <TableCell className={isMobile ? "px-3 py-3" : ""}>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">
                            {record.partName}
                          </div>
                          {record.partNumber && (
                            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">
                              {record.partNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-center ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {record.quantity}
                      </TableCell>
                      <TableCell className={isMobile ? "px-3 py-3" : ""}>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(record.issueDate).toLocaleDateString(
                            "fa-IR"
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {parseFloat(record.totalAmount).toLocaleString()} افغانی
                      </TableCell>
                      <TableCell
                        className={`text-green-600 font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {parseFloat(record.paidAmount).toLocaleString()} افغانی
                      </TableCell>
                      <TableCell
                        className={`text-amber-600 font-medium ${isMobile ? "px-3 py-3" : ""}`}
                      >
                        {parseFloat(record.outstanding).toLocaleString()} افغانی
                      </TableCell>
                      <TableCell className={isMobile ? "px-3 py-3" : ""}>
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
                      </TableCell>
                      <TableCell className={isMobile ? "px-3 py-3" : ""}>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {record.issuedBy}
                        </div>
                      </TableCell>
                      <TableCell className={isMobile ? "px-3 py-3" : ""}>
                        <div className="flex items-center gap-2">
                          {!record.isFullyPaid &&
                            parseFloat(record.outstanding) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPaymentDialog(record)}
                                className="border-green-500 text-green-600 hover:bg-green-50"
                              >
                                <CreditCard className="ml-2 h-3 w-3" />
                                پرداخت
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
    </div>
  );
}
