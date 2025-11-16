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
  DollarSign,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  RefreshCw,
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

  const filteredRecords = records.filter(
    (record) =>
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.normalizedName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">مدیریت فروش و پرداخت‌ها</h1>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل فروش</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords
                .reduce((sum, r) => sum + parseFloat(r.totalAmount), 0)
                .toLocaleString()}{" "}
              افغانی
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">پرداخت شده</CardTitle>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">باقیمانده</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
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
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead>نام مشتری</TableHead>
                  <TableHead>تعداد فروش</TableHead>
                  <TableHead>کل فروش</TableHead>
                  <TableHead>پرداخت شده</TableHead>
                  <TableHead>باقیمانده</TableHead>
                  <TableHead>وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerSummaryArray.map((customer, idx) => (
                  <TableRow
                    key={idx}
                    className="group hover:bg-accent/30 border-border transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {customer.customerName}
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
                    <TableCell className="text-orange-600 font-medium">
                      {customer.totalOutstanding.toLocaleString()} افغانی
                    </TableCell>
                    <TableCell>
                      {customer.totalOutstanding <= 0 ? (
                        <Badge className="bg-green-600">پرداخت کامل</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-orange-600 text-orange-600"
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
