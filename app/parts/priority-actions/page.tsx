// app/parts/priority-actions/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  FileSpreadsheet,
  Save,
  Edit,
  Trash2,
  Upload,
  FileText,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import {
  exportToExcel,
  importFromExcel,
  generateExcelTemplate,
  ExcelPart,
} from "@/lib/excel-utils";

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

// Bulk update parts API
const bulkUpdateParts = async (data: LowStockPart[]) => {
  const response = await fetch("/api/parts/bulk-update-stock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error("Failed to update parts");
  return response.json();
};

// Update part details API
const updatePartDetails = async (
  partId: number,
  updates: { section?: string; cost_price?: string; sale_price?: string }
) => {
  const response = await fetch(`/api/parts/${partId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error("Failed to update part details");
  return response.json();
};

export default function PriorityActionsPage() {
  const [parts, setParts] = useState<LowStockPart[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [updatingParts, setUpdatingParts] = useState<Set<number>>(new Set());
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Authentication and role check
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const session = await authClient.getSession();

        if (!session?.data?.user) {
          router.push("/login");
          return;
        }

        // Check if user is approved
        const approvalResponse = await fetch("/api/user/approval-status");
        if (approvalResponse.ok) {
          const { approved, role } = await approvalResponse.json();

          if (!approved) {
            await authClient.signOut();
            router.push("/login");
            return;
          }

          // Check admin role
          if (role !== "admin") {
            setAuthError("دسترسی ممنوع. امتیازات مدیریت مورد نیاز است.");
            return;
          }
        }

        setAuthLoading(false);
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/login");
      }
    };

    checkAdminAccess();
  }, [router]);

  const {
    data,
    isLoading: queryLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["low-stock-parts"],
    queryFn: fetchLowStockParts,
    refetchOnWindowFocus: false,
  });

  // Initialize state with data from API
  useEffect(() => {
    if (data) {
      setParts(data);
    }
  }, [data]);

  const isLoading = queryLoading;

  // Calculate totals
  const totals = useMemo(() => {
    const selectedParts = parts.filter(
      (part) => part.selected && part.requested_quantity > 0
    );
    return {
      totalItems: parts.length,
      selectedItems: parts.filter((part) => part.selected).length,
      itemsWithQuantity: selectedParts.length,
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
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setSelectAll(selected);
    setParts((prev) => prev.map((part) => ({ ...part, selected })));
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

  // Handle section change
  const handleSectionChange = async (id: number, section: string) => {
    const part = parts.find((p) => p.id === id);
    if (!part) return;

    // Update local state first
    setParts((prev) =>
      prev.map((p) => {
        if (p.part_number === part.part_number) {
          return { ...p, section };
        }
        return p;
      })
    );

    // Find all parts with same part number to update in database
    const samePartNumberParts = parts.filter(
      (p) => p.part_number === part.part_number
    );

    try {
      setUpdatingParts((prev) => new Set(prev).add(id));

      // Update all parts with same part number in database
      const updatePromises = samePartNumberParts.map((p) =>
        updatePartDetails(p.id, { section })
      );

      await Promise.all(updatePromises);
      toast.success(
        `بخش برای ${samePartNumberParts.length} قطعه با شماره ${part.part_number} بروزرسانی شد`
      );
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error("خطا در بروزرسانی بخش");
    } finally {
      setUpdatingParts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Handle cost price change
  const handleCostPriceChange = async (id: number, cost_price: string) => {
    const part = parts.find((p) => p.id === id);
    if (!part) return;

    const costPriceNum = parseFloat(cost_price) || 0;
    const salePriceNum = costPriceNum * 1.2; // 20% markup
    const sale_price = salePriceNum.toFixed(2);

    // Update local state first
    setParts((prev) =>
      prev.map((p) => {
        if (p.part_number === part.part_number) {
          const totalCost = p.requested_quantity * costPriceNum;
          return {
            ...p,
            cost_price,
            sale_price,
            total_cost: totalCost,
          };
        }
        return p;
      })
    );

    // Find all parts with same part number to update in database
    const samePartNumberParts = parts.filter(
      (p) => p.part_number === part.part_number
    );

    try {
      setUpdatingParts((prev) => new Set(prev).add(id));

      // Update all parts with same part number in database
      const updatePromises = samePartNumberParts.map((p) =>
        updatePartDetails(p.id, { cost_price, sale_price })
      );

      await Promise.all(updatePromises);
      toast.success(
        `قیمت برای ${samePartNumberParts.length} قطعه با شماره ${part.part_number} بروزرسانی شد`
      );
    } catch (error) {
      console.error("Error updating cost price:", error);
      toast.error("خطا در بروزرسانی قیمت");
    } finally {
      setUpdatingParts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
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
    toast.success(`مقدار کمبود برای ${totals.selectedItems} مورد محاسبه شد`);
  };

  // Export to Excel
  const handleExport = () => {
    const partsToExport = parts
      .filter((part) => part.requested_quantity > 0)
      .map((part) => ({
        part_number: part.part_number,
        name: part.name,
        section: part.section,
        min_stock: part.min_stock,
        current_stock: part.current_stock,
        deficit: part.deficit,
        requested_quantity: part.requested_quantity,
        cost_price: part.cost_price,
        total_cost: part.total_cost,
      }));

    if (partsToExport.length === 0) {
      toast.error("هیچ موردی با مقدار درخواستی موجود نیست");
      return;
    }

    try {
      exportToExcel(partsToExport);
      toast.success("فایل اکسل با موفقیت صادر شد");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("خطا در صادر کردن فایل اکسل");
    }
  };

  // Handle file import
  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("لطفا یک فایل اکسل معتبر انتخاب کنید");
      return;
    }

    setIsImporting(true);
    try {
      const importedData = await importFromExcel(file);

      if (importedData.length === 0) {
        toast.error("هیچ داده‌ای در فایل یافت نشد");
        return;
      }

      // Import data to state
      setParts((prev) =>
        prev.map((part) => {
          const importedPart = importedData.find(
            (item) => item.part_number === part.part_number
          );

          if (importedPart && importedPart.requested_quantity > 0) {
            const requestedQuantity = importedPart.requested_quantity;
            const totalCost =
              requestedQuantity * parseFloat(part.cost_price || "0");

            return {
              ...part,
              requested_quantity: requestedQuantity,
              total_cost: totalCost,
              selected: true,
            };
          }
          return part;
        })
      );

      const importedWithQuantity = importedData.filter(
        (item) => item.requested_quantity > 0
      ).length;
      toast.success(
        `داده‌های ${importedWithQuantity} مورد با موفقیت وارد شدند`
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "خطا در وارد کردن فایل"
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Generate template
  const handleGenerateTemplate = () => {
    generateExcelTemplate();
    toast.success("قالب اکسل با موفقیت ایجاد شد");
  };

  // Bulk update current stock
  const handleBulkUpdate = async () => {
    const partsToUpdate = parts.filter(
      (part) => part.selected && part.requested_quantity > 0
    );

    if (partsToUpdate.length === 0) {
      toast.error("هیچ مورد انتخاب شده‌ای با مقدار درخواستی موجود نیست");
      return;
    }

    setIsUpdating(true);
    try {
      const updateResult = await bulkUpdateParts(partsToUpdate);

      // Refresh data to get updated current stock
      await refetch();

      if (updateResult.success && updateResult.data) {
        const { updated, errors, summary } = updateResult.data;

        if (updated.length > 0) {
          toast.success(`موجودی ${updated.length} قطعه با موفقیت بروزرسانی شد`);
        }

        if (errors.length > 0) {
          console.warn("Bulk update errors:", errors);
          toast.error(
            `بروزرسانی ${summary.totalProcessed} مورد: ${updated.length} موفق، ${errors.length} ناموفق`
          );
        }
      } else {
        toast.error("خطا در بروزرسانی موجودی");
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error(
        error instanceof Error ? error.message : "خطا در بروزرسانی موجودی"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Clear all requested quantities
  const handleClearAll = () => {
    setParts((prev) =>
      prev.map((part) => ({
        ...part,
        requested_quantity: 0,
        total_cost: 0,
      }))
    );
    setSelectAll(false);
    toast.success("همه مقادیر درخواستی پاک شدند");
  };

  // Refresh data
  const handleRefresh = () => {
    refetch();
    toast.success("اطلاعات بروزرسانی شد");
  };

  // Group parts by part number to show related parts
  const partsByNumber = useMemo(() => {
    const groups: { [key: string]: LowStockPart[] } = {};
    parts.forEach((part) => {
      if (!groups[part.part_number]) {
        groups[part.part_number] = [];
      }
      groups[part.part_number].push(part);
    });
    return groups;
  }, [parts]);

  // Show authentication loading
  if (authLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-96">
          <Loader
            title="در حال بررسی دسترسی..."
            subtitle="لطفاً منتظر بمانید"
            size="md"
          />
        </div>
      </div>
    );
  }

  // Show authentication error
  if (authError) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">
            دسترسی ممنوع
          </h2>
          <p className="text-muted-foreground mb-4">{authError}</p>
          <Button onClick={() => router.push("/dashboard/staff")}>
            بازگشت به داشبورد کارمند
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-96">
          <Loader
            title="در حال بارگذاری اقدامات اولویت‌دار..."
            subtitle="لطفاً منتظر بمانید"
            size="md"
          />
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
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
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
          <Button variant="outline" size="sm" onClick={handleGenerateTemplate}>
            <FileText className="h-4 w-4 ml-1" />
            دریافت قالب
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Upload className="h-4 w-4 ml-1" />
            )}
            وارد کردن اکسل
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={totals.itemsWithQuantity === 0}
          >
            <Download className="h-4 w-4 ml-1" />
            خروجی اکسل
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleBulkUpdate}
            disabled={totals.itemsWithQuantity === 0 || isUpdating}
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Save className="h-4 w-4 ml-1" />
            )}
            بروزرسانی موجودی
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
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
            <Edit className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">آماده بروزرسانی</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {totals.itemsWithQuantity.toLocaleString("fa-IR")}
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-medium">
              عملیات گروهی ({totals.selectedItems} مورد انتخاب شده)
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkSetQuantity(10)}
              >
                تنظیم ۱۰ عدد
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkSetQuantity(50)}
              >
                تنظیم ۵۰ عدد
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkSetQuantity(100)}
              >
                تنظیم ۱۰۰ عدد
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkCalculateForDeficit}
              >
                محاسبه کمبود
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 ml-1" />
                پاک کردن همه
              </Button>
            </div>
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
                <TableHead>موجودی جدید</TableHead>
                <TableHead>قیمت واحد</TableHead>
                <TableHead>قیمت فروش</TableHead>
                <TableHead>مجموع هزینه</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => {
                const isCritical = part.current_stock === 0;
                const isLowStock = part.current_stock < part.min_stock / 2;
                const newStock = part.current_stock + part.requested_quantity;
                const samePartNumberCount =
                  partsByNumber[part.part_number]?.length || 0;
                const isUpdatingPart = updatingParts.has(part.id);

                return (
                  <TableRow
                    key={part.id}
                    className={`hover:bg-muted/50 ${
                      isCritical
                        ? "bg-red-50 dark:bg-red-950/20"
                        : isLowStock
                          ? "bg-orange-50 dark:bg-orange-950/20"
                          : ""
                    } ${
                      part.requested_quantity > 0
                        ? "bg-green-50 dark:bg-green-950/20"
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
                      <div className="flex items-center gap-2">
                        {part.part_number}
                        {samePartNumberCount > 1 && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-50"
                          >
                            {samePartNumberCount}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {part.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Input
                          value={part.section}
                          onChange={(e) =>
                            handleSectionChange(part.id, e.target.value)
                          }
                          className="w-16 text-center"
                          disabled={isUpdatingPart}
                        />
                        {isUpdatingPart && (
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
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
                      {part.requested_quantity > 0 ? (
                        <span className="text-green-600 font-medium">
                          {newStock.toLocaleString("fa-IR")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={part.cost_price}
                          onChange={(e) =>
                            handleCostPriceChange(part.id, e.target.value)
                          }
                          className="w-24 text-center"
                          disabled={isUpdatingPart}
                        />
                        {isUpdatingPart && (
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {parseFloat(part.sale_price || "0").toLocaleString(
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
                              : part.requested_quantity > 0
                                ? "border-green-600 text-green-600 bg-green-50 text-xs"
                                : "border-amber-600 text-amber-600 bg-amber-50 text-xs"
                        }
                      >
                        {isCritical
                          ? "تمام شده"
                          : isLowStock
                            ? "بحرانی"
                            : part.requested_quantity > 0
                              ? "آماده بروزرسانی"
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
