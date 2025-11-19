// components/parts/parts-records-table.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  User,
  Calendar,
  FileText,
  Eye,
  Download,
  Loader2,
  Smartphone,
  Monitor,
  Printer,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Loader from "@/components/loader";

// Define interfaces
interface PartsRecord {
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

export function PartsRecordsTable() {
  const [records, setRecords] = useState<PartsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PartsRecord | null>(
    null
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchRecords(1, 100); // Fetch first page on mount
  }, []);

  // Refetch records when search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(1, 100);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRecords = async (page = 1, limit = 100) => {
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
        setError("خطا در بارگذاری سوابق");
      }
    } catch (error) {
      console.error("Error fetching records:", error);
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

  const filteredRecords = records.filter(
    (record) =>
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.normalizedName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "approved":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "تکمیل شده";
      case "approved":
        return "تأیید شده";
      case "pending":
        return "در انتظار";
      default:
        return status;
    }
  };

  const handleDownloadPDF = async (recordId: number) => {
    try {
      const response = await fetch(`/api/issue-parts/${recordId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `record-${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("خطا در تولید فایل PDF");
    }
  };

  const handlePrintPDF = async (record: PartsRecord) => {
    // For now, use the same PDF generation as download
    await handleDownloadPDF(record.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
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

      <Card className="border-mechanical shadow-lg">
        <CardHeader className="bg-mechanical/50 border-b border-border">
          <CardTitle className="text-foreground flex flex-col sm:flex-row sm:items-center gap-4">
            <span>سوابق صدور قطعات</span>
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
            <div className="flex items-center justify-center py-8">
              <Loader
                title="در حال بارگذاری سوابق..."
                subtitle="لطفاً منتظر بمانید"
                size="sm"
              />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ سابقه‌ای یافت نشد</p>
            </div>
          ) : isMobile ? (
            // Mobile view
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-foreground">
                        {record.customerName}
                      </span>
                    </div>
                    <Badge
                      variant={getStatusVariant(record.status)}
                      className={
                        record.status === "completed" ? "bg-primary" : ""
                      }
                    >
                      {getStatusText(record.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{record.partName}</span>
                      {record.partNumber && (
                        <span className="font-mono bg-primary/10 px-1 rounded text-xs">
                          {record.partNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(record.issueDate).toLocaleDateString("fa-IR")}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {record.issuedBy}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>پرداخت شده:</span>
                        <span className="text-green-600 font-medium">
                          {parseFloat(record.paidAmount).toLocaleString()}{" "}
                          افغانی
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>باقیمانده:</span>
                        <span className="text-orange-600 font-medium">
                          {parseFloat(record.outstanding).toLocaleString()}{" "}
                          افغانی
                        </span>
                      </div>
                    </div>
                    <div className="font-medium text-foreground">
                      {parseFloat(record.totalAmount).toLocaleString()} افغانی
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedRecord(record)}
                        >
                          <Eye className="ml-2 h-4 w-4" />
                          مشاهده جزئیات
                        </Button>
                      </DialogTrigger>
                      <RecordDetailDialog
                        record={selectedRecord}
                        onPrint={() => handlePrintPDF(record)}
                      />
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(record.id)}
                      className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Printer className="ml-2 h-4 w-4" />
                      چاپ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop view
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead>مشتری</TableHead>
                    <TableHead>قطعه</TableHead>
                    <TableHead>تعداد</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>مبلغ کل</TableHead>
                    <TableHead>پرداخت شده</TableHead>
                    <TableHead>باقیمانده</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>صادر کننده</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="group hover:bg-accent/30 border-border transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {record.customerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{record.partName}</div>
                          {record.partNumber && (
                            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">
                              {record.partNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.quantity}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(record.issueDate).toLocaleDateString(
                            "fa-IR"
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {parseFloat(record.totalAmount).toLocaleString()} افغانی
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {parseFloat(record.paidAmount).toLocaleString()} افغانی
                      </TableCell>
                      <TableCell className="text-orange-600 font-medium">
                        {parseFloat(record.outstanding).toLocaleString()} افغانی
                      </TableCell>
                      <TableCell>
                        {record.isFullyPaid ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 ml-1" />
                            پرداخت کامل
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-orange-600 text-orange-600"
                          >
                            <AlertCircle className="h-3 w-3 ml-1" />
                            بدهکار
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {record.issuedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRecord(record)}
                              >
                                <Eye className="ml-2 h-4 w-4" />
                                مشاهده جزئیات
                              </Button>
                            </DialogTrigger>
                            <RecordDetailDialog
                              record={selectedRecord}
                              onPrint={() => handlePrintPDF(record)}
                            />
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(record.id)}
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <Printer className="ml-2 h-4 w-4" />
                            چاپ
                          </Button>
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
    </div>
  );
}

// Record Detail Dialog Component
function RecordDetailDialog({
  record,
  onPrint,
}: {
  record: PartsRecord | null;
  onPrint: () => void;
}) {
  if (!record) return null;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-center mb-4">
          جزئیات رکورد صدور
        </DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">شرکت قطعات خودرو</h2>
              <p className="text-muted-foreground">فروشگاه قطعات یدکی</p>
            </div>

            {/* Record Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">اطلاعات مشتری</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نام مشتری:</span>
                    <span className="font-medium">{record.customerName}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">اطلاعات قطعه</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نام قطعه:</span>
                    <span className="font-medium">{record.partName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">شماره قطعه:</span>
                    <span className="font-medium font-mono">
                      {record.partNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تعداد:</span>
                    <span className="font-medium">{record.quantity}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">اطلاعات مالی</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مبلغ کل:</span>
                    <span className="font-bold text-lg">
                      {parseFloat(record.totalAmount).toLocaleString()} افغانی
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">اطلاعات صدور</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاریخ صدور:</span>
                    <span className="font-medium">
                      {new Date(record.issueDate).toLocaleDateString("fa-IR")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">صادر کننده:</span>
                    <span className="font-medium">{record.issuedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">وضعیت:</span>
                    <Badge
                      variant={
                        record.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {record.status === "completed"
                        ? "تکمیل شده"
                        : record.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-center pt-4 border-t">
              <Button
                onClick={onPrint}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <Printer className="ml-2 h-5 w-5" />
                چاپ فاکتور
              </Button>
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}
