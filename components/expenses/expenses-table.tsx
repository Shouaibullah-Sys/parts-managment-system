// components/expenses/expenses-table.tsx
"use client";

import { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  ArrowUpDown,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Building,
  Receipt,
  Plus,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ExpenseForm } from "@/components/forms/expense-form";
import Loader from "@/components/loader";

interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  category: string;
  expenseDate: string;
  receiptNumber?: string;
  vendor?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpensesResponse {
  success: boolean;
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    totalExpenses: number;
  };
}

const expenseCategories = [
  "لوازم اداری",
  "خدمات عمومی",
  "حمل و نقل",
  "بازاریابی",
  "نگهداری",
  "سفر",
  "غذا و سرگرمی",
  "بیمه",
  "کرایه",
  "تجهیزات",
  "نرم افزار",
  "خدمات حرفه‌ای",
  "سایر",
];

export function ExpensesTable() {
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => setUserRole(data.role))
        .catch((error) => console.error("Error fetching user role:", error));
    }
  }, [session?.user]);

  const isAdmin = userRole === "admin";

  // State for table
  const [sorting, setSorting] = useState<SortingState>([
    { id: "expenseDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // State for pagination and filters
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: isMobile ? 5 : 10,
  });

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Fetch expenses data
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [paginationData, setPaginationData] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
  });
  const [summaryData, setSummaryData] = useState({
    totalAmount: 0,
    totalExpenses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(globalFilter && { search: globalFilter }),
        ...(categoryFilter &&
          categoryFilter !== "all" && { category: categoryFilter }),
        ...(startDateFilter &&
          endDateFilter && {
            startDate: startDateFilter,
            endDate: endDateFilter,
          }),
      });

      const response = await fetch(`/api/expenses?${params}`);
      const result: ExpensesResponse = await response.json();

      if (result.success) {
        setExpensesData(result.data || []);
        setPaginationData(result.pagination);
        setSummaryData(result.summary);
      } else {
        toast.error("دریافت مصارف ناموفق بود");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("خطا در بارگذاری مصارف");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [
    session?.user,
    pagination.pageIndex,
    pagination.pageSize,
    globalFilter,
    categoryFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Delete expense
  const handleDelete = async (expense: Expense) => {
    if (!isAdmin) {
      toast.error("شما اجازه حذف مصارف را ندارید");
      return;
    }

    if (
      confirm(
        `آیا مطمئن هستید که می‌خواهید مصرف "${expense.title}" را حذف کنید؟`
      )
    ) {
      try {
        const response = await fetch(`/api/expenses/${expense.id}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
          toast.success("مصرف با موفقیت حذف شد");
          fetchExpenses();
        } else {
          toast.error(result.error || "حذف مصرف ناموفق بود");
        }
      } catch (error) {
        console.error("Error deleting expense:", error);
        toast.error("حذف مصرف ناموفق بود");
      }
    }
  };

  // Edit expense
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditFormOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "AFN",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Define columns for mobile and desktop
  const mobileColumns: ColumnDef<Expense>[] = [
    {
      accessorKey: "title",
      header: "Expense",
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-medium">{expense.title}</span>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {expense.description || "بدون توضیحات"}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {expense.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(expense.expenseDate)}
              </span>
            </div>
            <div className="text-sm font-semibold text-green-600">
              {formatCurrency(expense.amount)}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <ActionMenu
            expense={expense}
            isAdmin={isAdmin}
            onEdit={() => handleEdit(expense)}
            onDelete={() => handleDelete(expense)}
            isMobile={true}
          />
        );
      },
    },
  ];

  const desktopColumns: ColumnDef<Expense>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-accent hover:text-accent-foreground"
          >
            عنوان
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            {row.getValue("title")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "دسته‌بندی",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize border-primary/30">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "مقدار",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number;
        return (
          <div className="text-left font-mono font-semibold text-green-600">
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "expenseDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-accent hover:text-accent-foreground"
          >
            تاریخ
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatDate(row.getValue("expenseDate"))}
        </div>
      ),
    },
    {
      accessorKey: "vendor",
      header: "فروشنده",
      cell: ({ row }) => {
        const vendor = row.getValue("vendor") as string;
        return (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[150px] truncate">
              {vendor || "ناموجود"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "receiptNumber",
      header: "شماره رسید",
      cell: ({ row }) => {
        const receiptNumber = row.getValue("receiptNumber") as string;
        return (
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[120px] truncate">
              {receiptNumber || "ناموجود"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <ActionMenu
            expense={expense}
            isAdmin={isAdmin}
            onEdit={() => handleEdit(expense)}
            onDelete={() => handleDelete(expense)}
            isMobile={false}
          />
        );
      },
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  const table = useReactTable({
    data: expensesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    manualPagination: true,
    pageCount: paginationData.totalPages || -1,
  });

  // Clear all filters
  const clearFilters = () => {
    setGlobalFilter("");
    setCategoryFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    globalFilter ||
    categoryFilter !== "all" ||
    startDateFilter ||
    endDateFilter;

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                مجموع مصارف
              </p>
              <p className="text-2xl font-bold text-foreground">
                {summaryData.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-full bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                مجموع مبلغ
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summaryData.totalAmount)}
              </p>
            </div>
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">فیلترها</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              پاک کردن همه
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجوی مصارف..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pr-8"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="همه دسته‌بندی‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
              {expenseCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="تاریخ شروع"
            value={startDateFilter}
            onChange={(event) => setStartDateFilter(event.target.value)}
          />

          <Input
            type="date"
            placeholder="تاریخ پایان"
            value={endDateFilter}
            onChange={(event) => setEndDateFilter(event.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <Loader
                    title="در حال بارگذاری مصارف..."
                    subtitle="لطفاً صبر کنید"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group hover:bg-accent/30 transition-colors"
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">هیچ مصرفی یافت نشد</p>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveFilters
                          ? "سعی کنید فیلترهای خود را تنظیم کنید"
                          : "با اضافه کردن اولین مصرف خود شروع کنید"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          نمایش {table.getRowModel().rows.length} از {paginationData.total} مصرف
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            قبلی
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">صفحه</span>
            <strong className="text-sm">
              {pagination.pageIndex + 1} از {table.getPageCount()}
            </strong>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            بعدی
          </Button>
        </div>
      </div>

      {/* Edit Expense Form */}
      {isEditFormOpen && editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">ویرایش مصرف</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditFormOpen(false);
                  setEditingExpense(null);
                }}
              >
                ×
              </Button>
            </div>
            <div className="p-6">
              <ExpenseForm
                expense={editingExpense}
                onSubmit={() => {
                  fetchExpenses();
                  setIsEditFormOpen(false);
                  setEditingExpense(null);
                }}
                className="space-y-4"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Action Menu Component
function ActionMenu({
  expense,
  isAdmin,
  onEdit,
  onDelete,
  isMobile,
}: {
  expense: Expense;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size={isMobile ? "sm" : "icon"}
        onClick={onEdit}
        title="ویرایش مصرف"
      >
        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
        {isMobile && <span className="ml-1">ویرایش</span>}
      </Button>

      {isAdmin && (
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          onClick={onDelete}
          title="حذف مصرف"
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          {isMobile && <span className="ml-1">حذف</span>}
        </Button>
      )}
    </div>
  );
}
