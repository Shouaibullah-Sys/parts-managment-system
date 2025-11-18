// app/parts/priority-actions/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Calculator,
  AlertTriangle,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Types
interface LowStockPart {
  id: number;
  part_number: string;
  name: string;
  section: string;
  min_stock: number;
  current_stock: number;
  cost_price: string;
  sale_price: string;
  requested_quantity: number;
  deficit: number;
  total_cost: number;
  selected: boolean;
}

// Excel export utility
const exportToExcel = (data: LowStockPart[]) => {
  const headers = [
    "شماره قطعه",
    "نام قطعه",
    "بخش",
    "حداقل موجودی",
    "موجودی فعلی",
    "کمبود",
    "مقدار درخواستی",
    "قیمت واحد (افغانی)",
    "مجموع هزینه (افغانی)",
  ];

  const csvContent = [
    headers.join(","),
    ...data.map((item) =>
      [
        item.part_number,
        `"${item.name}"`,
        item.section,
        item.min_stock,
        item.current_stock,
        item.deficit,
        item.requested_quantity || 0,
        item.cost_price,
        item.total_cost || 0,
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `priority-actions-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success("فایل با موفقیت صادر شد");
};

// API function
const fetchLowStockParts = async (): Promise<LowStockPart[]> => {
  const response = await fetch("/api/parts?limit=1000");
  if (!response.ok) throw new Error("Failed to fetch parts data");

  const result = await response.json();
  if (!result.success) throw new Error(result.error);

  const lowStockParts = result.data
    .filter((part: any) => {
      const currentStock = part.current_stock || part.currentStock || 0;
      const minStock = part.min_stock || part.minStock || 0;
      return currentStock < minStock && part.active !== false;
    })
    .map((part: any) => ({
      id: part.id,
      part_number: part.part_number || part.partNumber,
      name: part.name,
      section: part.section || "E",
      min_stock: part.min_stock || part.minStock || 0,
      current_stock: part.current_stock || part.currentStock || 0,
      cost_price: part.cost_price || part.costPrice || "0",
      sale_price: part.sale_price || part.salePrice || "0",
      requested_quantity: 0,
      deficit:
        (part.min_stock || part.minStock || 0) -
        (part.current_stock || part.currentStock || 0),
      total_cost: 0,
      selected: false,
    }));

  return lowStockParts;
};

export default function PriorityActionsPage() {
  const [parts, setParts] = useState<LowStockPart[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["low-stock-parts"],
    queryFn: fetchLowStockParts,
  });

  useEffect(() => {
    if (data) {
      setParts(data);
    }
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    const selectedParts = parts.filter((part) => part.selected);
    return {
      totalItems: parts.length,
      selectedItems: selectedParts.length,
      totalRequestedQuantity: selectedParts.reduce(
        (sum, part) => sum + part.requested_quantity,
        0
      ),
      totalCost: selectedParts.reduce((sum, part) => sum + part.total_cost, 0),
    };
  }, [parts]);

  // Handle individual part selection
  const handlePartSelect = (id: number, selected: boolean) => {
    setParts((prev) =>
      prev.map((part) => (part.id === id ? { ...part, selected } : part))
    );
    updateSelectAllState();
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setSelectAll(selected);
    setParts((prev) => prev.map((part) => ({ ...part, selected })));
  };

  // Update select all checkbox state
  const updateSelectAllState = () => {
    const selectedCount = parts.filter((part) => part.selected).length;
    setSelectAll(selectedCount === parts.length && parts.length > 0);
  };

  // Handle quantity change
  const handleQuantityChange = (id: number, quantity: number) => {
    setParts((prev) =>
      prev.map((part) => {
        if (part.id === id) {
          const requestedQuantity = Math.max(0, quantity);
          const totalCost =
            requestedQuantity * parseFloat(part.cost_price || "0");
          return {
            ...part,
            requested_quantity: requestedQuantity,
            total_cost: totalCost,
          };
        }
        return part;
      })
    );
  };

  // Bulk operations
  const handleBulkSetQuantity = (quantity: number) => {
    setParts((prev) =>
      prev.map((part) => {
        if (part.selected) {
          const requestedQuantity = Math.max(0, quantity);
          const totalCost =
            requestedQuantity * parseFloat(part.cost_price || "0");
          return {
            ...part,
            requested_quantity: requestedQuantity,
            total_cost: totalCost,
          };
        }
        return part;
      })
    );
    toast.success(
      `مقدار ${quantity.toLocaleString("fa-IR")} برای ${totals.selectedItems} مورد تنظیم شد`
    );
  };

  const handleBulkCalculateForAll = () => {
    setParts((prev) =>
      prev.map((part) => {
        if (part.selected) {
          const requestedQuantity = part.deficit;
          const totalCost =
            requestedQuantity * parseFloat(part.cost_price || "0");
          return {
            ...part,
            requested_quantity: requestedQuantity,
            total_cost: totalCost,
          };
        }
        return part;
      })
    );
    toast.success(`مقدار کمبود برای ${totals.selectedItems} مورد محاسبه شد`);
  };

  const handleBulkCalculateForDeficit = () => {
    setParts((prev) =>
      prev.map((part) => {
        if (part.selected) {
          const requestedQuantity = part.deficit;
          const totalCost =
            requestedQuantity * parseFloat(part.cost_price || "0");
          return {
            ...part,
            requested_quantity: requestedQuantity,
            total_cost: totalCost,
          };
        }
        return part;
      })
    );
    toast.success(`مقدار کمبود برای ${totals.selectedItems} مورد تنظیم شد`);
  };

  // Export selected data
  const handleExport = () => {
    const selectedParts = parts.filter(
      (part) => part.selected && part.requested_quantity > 0
    );
    if (selectedParts.length === 0) {
      toast.error("هیچ مورد انتخاب شده‌ای با مقدار درخواستی موجود نیست");
      return;
    }
    exportToExcel(selectedParts);
  };

  // Refresh data
  const handleRefresh = () => {
    refetch();
    toast.success("اطلاعات بروزرسانی شد");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              در حال بارگذاری اقدامات اولویت‌دار...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">
            خطا در بارگذاری اطلاعات
          </h2>
          <p className="text-muted-foreground mb-4">
            بارگذاری موارد کمبود موجودی با خطا مواجه شد
          </p>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 animate-spin ml-2" />
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin">
              <ArrowLeft className="h-4 w-4 ml-1" />
              بازگشت به داشبورد
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              اقدامات اولویت‌دار
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              تکمیل موجودی قطعات با کمبود -{" "}
              {totals.totalItems.toLocaleString("fa-IR")} مورد
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={totals.selectedItems === 0}
          >
            <Download className="h-4 w-4 ml-1" />
            خروجی اکسل
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium">مجموع موارد</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {totals.totalItems.toLocaleString("fa-IR")}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">انتخاب شده</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {totals.selectedItems.toLocaleString("fa-IR")}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">مجموع مقدار</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {totals.totalRequestedQuantity.toLocaleString("fa-IR")}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium">مجموع هزینه</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {totals.totalCost.toLocaleString("fa-IR")} افغانی
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {totals.selectedItems > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium mb-3">عملیات گروهی</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkSetQuantity(10)}
            >
              تنظیم ۱۰ عدد برای همه
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkSetQuantity(50)}
            >
              تنظیم ۵۰ عدد برای همه
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkSetQuantity(100)}
            >
              تنظیم ۱۰۰ عدد برای همه
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCalculateForDeficit}
            >
              محاسبه کمبود برای همه
            </Button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>شماره قطعه</TableHead>
                <TableHead>نام قطعه</TableHead>
                <TableHead>بخش</TableHead>
                <TableHead>حداقل موجودی</TableHead>
                <TableHead>موجودی فعلی</TableHead>
                <TableHead>کمبود</TableHead>
                <TableHead>مقدار درخواستی</TableHead>
                <TableHead>قیمت واحد</TableHead>
                <TableHead>مجموع هزینه</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => {
                const isCritical = part.current_stock === 0;
                const isLowStock = part.current_stock < part.min_stock / 2;

                return (
                  <TableRow
                    key={part.id}
                    className={`hover:bg-muted/50 ${
                      isCritical
                        ? "bg-red-50 dark:bg-red-950/20"
                        : isLowStock
                          ? "bg-orange-50 dark:bg-orange-950/20"
                          : ""
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={part.selected}
                        onCheckedChange={(checked) =>
                          handlePartSelect(part.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium whitespace-nowrap">
                      {part.part_number}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {part.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {part.section}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {part.min_stock.toLocaleString("fa-IR")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span
                        className={
                          isCritical
                            ? "text-red-600 font-bold"
                            : isLowStock
                              ? "text-orange-600 font-medium"
                              : "text-amber-600"
                        }
                      >
                        {part.current_stock.toLocaleString("fa-IR")}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-red-600 font-medium">
                        -{part.deficit.toLocaleString("fa-IR")}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Input
                        type="number"
                        min="0"
                        value={part.requested_quantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            part.id,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {parseFloat(part.cost_price || "0").toLocaleString(
                        "fa-IR"
                      )}{" "}
                      افغانی
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {part.total_cost > 0
                        ? `${part.total_cost.toLocaleString("fa-IR")} افغانی`
                        : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={isCritical ? "destructive" : "outline"}
                        className={
                          isCritical
                            ? "bg-red-600 text-xs"
                            : isLowStock
                              ? "border-orange-600 text-orange-600 bg-orange-50 text-xs"
                              : "border-amber-600 text-amber-600 bg-amber-50 text-xs"
                        }
                      >
                        {isCritical
                          ? "تمام شده"
                          : isLowStock
                            ? "بحرانی"
                            : "موجودی کم"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {parts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">
            هیچ مورد کمبود موجودی وجود ندارد
          </p>
          <p className="text-sm mt-2">همه موارد به اندازه کافی موجود هستند</p>
        </div>
      )}
    </div>
  );
}
