// components/parts/parts-table.tsx
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
  Copy,
  Eye,
  Package,
  Plus,
} from "lucide-react";
import { Part, PartsResponse } from "@/types/parts";
import { useParts, useDeletePart } from "@/hooks/use-parts";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function PartsTable() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);

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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // State for pagination and filters
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  // Fetch parts with current filters - always ensure user is authenticated
  const {
    data: partsResponse,
    isLoading,
    error,
    refetch,
  } = useParts(
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: globalFilter || undefined,
      section: sectionFilter || undefined,
      active: activeFilter ? activeFilter === "true" : undefined,
    },
    {
      enabled: !!session?.user, // Only fetch when user is authenticated
    }
  );

  const deletePartMutation = useDeletePart();

  // Safe data extraction
  const partsData = (partsResponse as PartsResponse)?.data || [];
  const paginationData = (partsResponse as PartsResponse)?.pagination || {
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
  };

  // Debug logging
  useEffect(() => {
    console.log("Parts Response:", partsResponse);
    console.log("Parts Data:", partsData);
    console.log("Pagination Data:", paginationData);
  }, [partsResponse, partsData, paginationData]);

  // Calculate summary statistics
  const totalParts = paginationData.total || 0;
  const activeParts = partsData.filter((part) => part.active).length;
  const inactiveParts = totalParts - activeParts;

  // Define columns
  const columns: ColumnDef<Part>[] = [
    {
      accessorKey: "partNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            شماره قطعه
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            {row.getValue("partNumber")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "نام",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue("name")}>
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "section",
      header: "بخش",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("section")}
        </Badge>
      ),
    },
    {
      accessorKey: "minStock",
      header: "حداقل موجودی",
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.getValue("minStock")}</div>
      ),
    },
    {
      accessorKey: "costPrice",
      header: "قیمت خرید",
      cell: ({ row }) => {
        const costPrice = row.getValue("costPrice") as string;
        return (
          <div className="text-right font-mono">
            {costPrice ? `$${parseFloat(costPrice).toFixed(2)}` : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "salePrice",
      header: "قیمت فروش",
      cell: ({ row }) => {
        const salePrice = row.getValue("salePrice") as string;
        return (
          <div className="text-right font-mono">
            {salePrice ? `$${parseFloat(salePrice).toFixed(2)}` : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: "وضعیت",
      cell: ({ row }) => {
        const isActive = row.getValue("active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "فعال" : "غیرفعال"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const part = row.original;

        const handleDelete = async () => {
          // Check if user is admin - this check is redundant since delete button only shows for admin
          // but we keep it for additional security
          if (!isAdmin) {
            alert(
              "شما اجازه حذف قطعات را ندارید. فقط ادمین می‌تواند قطعات را حذف کند."
            );
            return;
          }

          if (
            confirm(
              `آیا مطمئن هستید که می‌خواهید قطعه "${part.partNumber}" را حذف کنید؟`
            )
          ) {
            try {
              await deletePartMutation.mutateAsync(part.id);
              // Refetch parts to update the list
              refetch();
            } catch (error) {
              console.error("Error deleting part:", error);
              alert("خطا در حذف قطعه. لطفاً دوباره تلاش کنید.");
            }
          }
        };

        const handleCopyPartNumber = () => {
          navigator.clipboard.writeText(part.partNumber);
        };

        return (
          <div className="flex items-center gap-2">
            {/* Quick View Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/parts/${part.id}`)}
              title="مشاهده جزئیات"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* Edit Button - Only visible for admin */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/parts/${part.id}/edit`)}
                title="ویرایش قطعه"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Dropdown for additional actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">باز کردن منو</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>عملیات</DropdownMenuLabel>

                <DropdownMenuItem onClick={handleCopyPartNumber}>
                  <Copy className="mr-2 h-4 w-4" />
                  کپی شماره قطعه
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push(`/parts/${part.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  مشاهده جزئیات
                </DropdownMenuItem>

                {/* Only show admin options for admin users */}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push(`/parts/${part.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      ویرایش قطعه
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      حذف قطعه
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: partsData,
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <div className="text-red-600">
          خطا در بارگیری قطعات: {(error as Error).message}
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          دوباره تلاش کنید
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                مجموع قطعات
              </p>
              <p className="text-2xl font-bold">
                {totalParts.toLocaleString()}
              </p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                قطعات فعال
              </p>
              <p className="text-2xl font-bold text-green-600">
                {activeParts.toLocaleString()}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-green-600"></div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                قطعات غیرفعال
              </p>
              <p className="text-2xl font-bold text-gray-600">
                {inactiveParts.toLocaleString()}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-gray-600"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بر اساس شماره قطعه یا نام جستجو کنید..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-8 bg-background"
          />
        </div>

        <Select
          value={sectionFilter || "all-sections"}
          onValueChange={(value) =>
            setSectionFilter(value === "all-sections" ? "" : value)
          }
        >
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="بخش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-sections">همه بخش‌ها</SelectItem>
            <SelectItem value="E">بخش E</SelectItem>
            <SelectItem value="D">بخش D</SelectItem>
            <SelectItem value="F">بخش F</SelectItem>
            <SelectItem value="G">بخش G</SelectItem>
            <SelectItem value="OLD">قدیمی</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={activeFilter || "all-status"}
          onValueChange={(value) =>
            setActiveFilter(value === "all-status" ? "" : value)
          }
        >
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">همه وضعیت‌ها</SelectItem>
            <SelectItem value="true">فعال</SelectItem>
            <SelectItem value="false">غیرفعال</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {(globalFilter || sectionFilter || activeFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setGlobalFilter("");
              setSectionFilter("");
              setActiveFilter("");
            }}
            className="text-sm"
          >
            پاک کردن فیلترها
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
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
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    در حال بارگیری قطعات...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group hover:bg-muted/50"
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
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">هیچ قطعه‌ای یافت نشد</p>
                      <p className="text-sm text-muted-foreground">
                        {globalFilter || sectionFilter || activeFilter
                          ? "فیلترهای خود را تغییر دهید"
                          : "با ایجاد اولین قطعه خود شروع کنید"}
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
          نمایش {table.getRowModel().rows.length} از {paginationData.total} قطعه
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
    </div>
  );
}
