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
  RotateCcw,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Part, PartsResponse } from "@/types/parts";
import { useParts, useDeletePart } from "@/hooks/use-parts";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { EditPartDialog } from "./edit-part-dialog";
import Loader from "@/components/loader";

export function PartsTable() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // State for pagination and filters
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: isMobile ? 5 : 10,
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

  // Calculate summary statistics
  const totalParts = paginationData.total || 0;
  const activeParts = partsData.filter((part) => part.active).length;
  const inactiveParts = totalParts - activeParts;

  // Define columns for mobile and desktop
  const mobileColumns: ColumnDef<Part>[] = [
    {
      accessorKey: "partNumber",
      header: "قطعه",
      cell: ({ row }) => {
        const part = row.original;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">{part.partNumber}</span>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {part.name}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {part.section}
              </Badge>
              <Badge
                variant={part.active ? "default" : "secondary"}
                className="text-xs"
              >
                {part.active ? "فعال" : "غیرفعال"}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      id: "prices",
      header: "قیمت‌ها",
      cell: ({ row }) => {
        const part = row.original;
        return (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">خرید:</span>
              <span className="font-mono">
                {part.costPrice ? `AFN ${parseFloat(part.costPrice)}` : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">فروش:</span>
              <span className="font-mono">
                {part.salePrice ? `AFN ${parseFloat(part.salePrice)}` : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">حداقل:</span>
              <span className="font-mono">{part.minStock}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">فعلی:</span>
              <span
                className={`font-mono ${(part.currentStock || 0) <= part.minStock ? "text-red-600 font-bold" : ""}`}
              >
                {part.currentStock || 0}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => {
        const part = row.original;
        return (
          <ActionMenu
            part={part}
            isAdmin={isAdmin}
            onEdit={() => {
              setEditingPart(part);
              setIsEditDialogOpen(true);
            }}
            onRefetch={refetch}
          />
        );
      },
    },
  ];

  const desktopColumns: ColumnDef<Part>[] = [
    {
      accessorKey: "partNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-accent hover:text-accent-foreground"
          >
            پارت نمبر
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
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
        <Badge variant="outline" className="capitalize border-primary/30">
          {row.getValue("section")}
        </Badge>
      ),
    },
    {
      accessorKey: "minStock",
      header: "حداقل موجودی",
      cell: ({ row }) => (
        <div className="font-mono text-center">{row.getValue("minStock")}</div>
      ),
    },
    {
      accessorKey: "currentStock",
      header: "موجودی فعلی",
      cell: ({ row }) => {
        const currentStock = row.getValue("currentStock") as number;
        const minStock = row.getValue("minStock") as number;
        return (
          <div className="font-mono text-center">
            <span
              className={
                currentStock <= minStock ? "text-red-600 font-bold" : ""
              }
            >
              {currentStock}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "costPrice",
      header: "قیمت خرید",
      cell: ({ row }) => {
        const costPrice = row.getValue("costPrice") as string;
        return (
          <div className="text-Left font-mono">
            {costPrice ? `AFN ${parseFloat(costPrice)}` : "-"}
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
          <div className="text-Left font-mono">
            {salePrice ? `AFN ${parseFloat(salePrice)}` : "-"}
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
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-primary" : ""}
          >
            {isActive ? "فعال" : "غیرفعال"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const part = row.original;
        return (
          <ActionMenu
            part={part}
            isAdmin={isAdmin}
            onEdit={() => {
              setEditingPart(part);
              setIsEditDialogOpen(true);
            }}
            onRefetch={refetch}
          />
        );
      },
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

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

  // Action Menu Component
  function ActionMenu({
    part,
    isAdmin,
    onEdit,
    onRefetch,
  }: {
    part: Part;
    isAdmin: boolean;
    onEdit: () => void;
    onRefetch: () => void;
  }) {
    const deletePartMutation = useDeletePart();

    const handleDelete = async () => {
      if (!isAdmin) {
        alert(
          "شما اجازه حذف پرزه را ندارید. فقط ادمین می‌تواند پرزه را حذف کند."
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
          onRefetch();
        } catch (error) {
          console.error("Error deleting part:", error);
          alert("خطا در حذف قطعه. لطفاً دوباره تلاش کنید.");
        }
      }
    };

    const handleReactivate = async () => {
      if (!isAdmin) {
        alert("شما اجازه فعال‌سازی مجدد پرزه را ندارید.");
        return;
      }

      try {
        const response = await fetch(`/api/parts/${part.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active: true }),
        });

        if (!response.ok) {
          throw new Error("Failed to reactivate part");
        }

        onRefetch();
      } catch (error) {
        console.error("Error reactivating part:", error);
        alert("خطا در فعال‌سازی مجدد قطعه. لطفاً دوباره تلاش کنید.");
      }
    };

    const handleCopyPartNumber = () => {
      navigator.clipboard.writeText(part.partNumber);
    };

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          onClick={onEdit}
          title="مشاهده و ویرایش"
          className={isMobile ? "text-xs px-2" : ""}
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
          {isMobile && <span className="mr-1">مشاهده</span>}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`p-0 ${isMobile ? "h-8 w-8" : "h-8 w-8"}`}
            >
              <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-popover">
            <DropdownMenuLabel>عملیات</DropdownMenuLabel>

            <DropdownMenuItem
              onClick={handleCopyPartNumber}
              className="focus:bg-accent"
            >
              <Copy className="mr-2 h-4 w-4" />
              کپی شماره قطعه
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onEdit} className="focus:bg-accent">
              <Eye className="mr-2 h-4 w-4" />
              مشاهده و ویرایش
            </DropdownMenuItem>

            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                {!part.active ? (
                  <DropdownMenuItem
                    onClick={handleReactivate}
                    className="text-green-600 focus:bg-green-50 dark:focus:bg-green-950"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    فعال‌سازی مجدد
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    حذف قطعه
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <div className="text-destructive text-center">
          خطا در بارگیری پرزه: {(error as Error).message}
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          دوباره تلاش کنید
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-mechanical border-mechanical rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                مجموع پرزه
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalParts.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-full bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-mechanical border-mechanical rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                پرزه فعال
              </p>
              <p className="text-2xl font-bold text-green-600">
                {activeParts.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
              <div className="h-3 w-3 rounded-full bg-green-600"></div>
            </div>
          </div>
        </div>

        <div className="bg-mechanical border-mechanical rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                پرزه غیرفعال
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {inactiveParts.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
              <div className="h-3 w-3 rounded-full bg-amber-600"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-mechanical rounded-lg border-mechanical">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بر اساس پارت نمبر یا نام پرزه جستجو کنید..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pr-8 bg-background border-border"
          />
        </div>

        <div className="relative w-full sm:w-40">
          <Input
            placeholder="فیلتر بخش..."
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="bg-background border-border"
          />
        </div>

        <Select
          value={activeFilter || "all-status"}
          onValueChange={(value) =>
            setActiveFilter(value === "all-status" ? "" : value)
          }
        >
          <SelectTrigger className="w-full sm:w-32 bg-background border-border">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover">
            <SelectItem value="all-status">همه وضعیت‌ها</SelectItem>
            <SelectItem value="true">فعال</SelectItem>
            <SelectItem value="false">غیرفعال</SelectItem>
          </SelectContent>
        </Select>

        {(globalFilter || sectionFilter || activeFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setGlobalFilter("");
              setSectionFilter("");
              setActiveFilter("");
            }}
            className="text-sm text-primary hover:text-primary/80"
          >
            پاک کردن فیلترها
          </Button>
        )}
      </div>

      {/* Table */}
      <div
        className={`rounded-md border border-border ${isMobile ? "overflow-hidden" : "overflow-x-auto"}`}
      >
        <Table className={isMobile ? "w-full" : "min-w-full"}>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={isMobile ? "px-3 py-2" : ""}
                  >
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
                    title="در حال بارگیری قطعات..."
                    subtitle="لطفاً منتظر بمانید"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group hover:bg-accent/30 border-border transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={isMobile ? "px-3 py-3" : ""}
                    >
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
            className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
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
            className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            بعدی
          </Button>
        </div>
      </div>

      {/* Edit Part Dialog */}
      <EditPartDialog
        part={editingPart}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
