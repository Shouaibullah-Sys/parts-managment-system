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
import { Part } from "@/types/parts";
import { useParts, useDeletePart } from "@/hooks/use-parts";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
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

  // Fetch parts with current filters
  const {
    data: partsResponse,
    isLoading,
    error,
    refetch,
  } = useParts({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: globalFilter || undefined,
    section: sectionFilter || undefined,
    active: activeFilter ? activeFilter === "true" : undefined,
  });

  const deletePartMutation = useDeletePart();

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
            Part Number
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
      header: "Name",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue("name")}>
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("section")}
        </Badge>
      ),
    },
    {
      accessorKey: "minStock",
      header: "Min Stock",
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.getValue("minStock")}</div>
      ),
    },
    {
      accessorKey: "costPrice",
      header: "Cost Price",
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
      header: "Sale Price",
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
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const part = row.original;

        const handleDelete = async () => {
          if (
            confirm(
              `Are you sure you want to delete part "${part.partNumber}"?`
            )
          ) {
            try {
              await deletePartMutation.mutateAsync(part.id);
              // Refetch parts to update the list
              refetch();
            } catch (error) {
              console.error("Error deleting part:", error);
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
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* Edit Button - Always visible for quick access */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/parts/${part.id}/edit`)}
                title="Edit part"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Dropdown for additional actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>

                <DropdownMenuItem onClick={handleCopyPartNumber}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy part number
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push(`/parts/${part.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push(`/parts/${part.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit part
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete part
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
    data: partsResponse?.data || [],
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
    pageCount: partsResponse?.pagination.totalPages ?? -1,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <div className="text-red-600">
          Error loading parts: {(error as Error).message}
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by part number or name..."
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
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-sections">All Sections</SelectItem>
            <SelectItem value="E">Section E</SelectItem>
            <SelectItem value="D">Section D</SelectItem>
            <SelectItem value="F">Section F</SelectItem>
            <SelectItem value="G">Section G</SelectItem>
            <SelectItem value="OLD">OLD</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={activeFilter || "all-status"}
          onValueChange={(value) =>
            setActiveFilter(value === "all-status" ? "" : value)
          }
        >
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
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
            Clear Filters
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
                    Loading parts...
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
                      <p className="font-medium">No parts found</p>
                      <p className="text-sm text-muted-foreground">
                        {globalFilter || sectionFilter || activeFilter
                          ? "Try changing your filters"
                          : "Get started by creating your first part"}
                      </p>
                    </div>
                    {isAdmin &&
                      !globalFilter &&
                      !sectionFilter &&
                      !activeFilter && (
                        <Link href="/parts/new">
                          <Button className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Part
                          </Button>
                        </Link>
                      )}
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
          Showing {table.getRowModel().rows.length} of{" "}
          {partsResponse?.pagination.total || 0} parts
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">Page</span>
            <strong className="text-sm">
              {pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
