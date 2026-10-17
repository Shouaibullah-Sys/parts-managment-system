// components/partners/partners-table.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PartnerFormDialog, type Partner } from "./partner-form-dialog";

const PAGE_SIZE = 10;

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fa-IR-u-nu-latn");
  } catch {
    return "—";
  }
};

const formatPercentage = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("fa-IR-u-nu-latn")}٪`;
};

export function PartnersTable({ isAdmin }: { isAdmin: boolean }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "all") params.set("active", statusFilter);

        const response = await fetch(`/api/partners?${params.toString()}`, {
          credentials: "include",
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.success) {
          throw new Error(data.error || "خطا در دریافت شرکا");
        }
        setPartners(data.data || []);
        if (data.pagination) setPagination(data.pagination);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "خطا در دریافت شرکا");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [page, search, statusFilter, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setEditing(partner);
    setDialogOpen(true);
  };

  const toggleActive = async (partner: Partner) => {
    try {
      const response = await fetch(`/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: !partner.active }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "خطا در تغییر وضعیت");
      }
      toast.success(partner.active ? "شریک غیرفعال شد" : "شریک فعال شد");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در تغییر وضعیت");
    }
  };

  const removePartner = async (partner: Partner) => {
    const confirmed = window.confirm(
      `آیا از حذف شریک «${partner.name}» مطمئن هستید؟ این کار قابل بازگشت نیست.`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/partners/${partner.id}?hard=true`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "خطا در حذف شریک");
      }
      toast.success("شریک حذف شد");
      // if we deleted the only row on the last page, step back a page
      if (partners.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف شریک");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            شرکا
          </CardTitle>
          <CardDescription>
            افزودن و مدیریت شرکا برای تقسیم سود فروش قطعات.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={isLoading}
            title="تازه‌سازی"
          >
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="me-1 h-4 w-4" />
              افزودن شریک
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجو بر اساس نام یا شماره تماس..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pe-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as "all" | "true" | "false");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="true">فعال</SelectItem>
              <SelectItem value="false">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">#</TableHead>
                <TableHead>نام شریک</TableHead>
                <TableHead>شماره تماس</TableHead>
                <TableHead className="text-center">درصد</TableHead>
                <TableHead>یادداشت</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead className="text-center">تاریخ ایجاد</TableHead>
                {isAdmin && (
                  <TableHead className="text-center">عملیات</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 8 : 7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    در حال بارگیری...
                  </TableCell>
                </TableRow>
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 8 : 7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    هیچ شریکی یافت نشد.
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner, index) => (
                  <TableRow key={partner.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {partner.name}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {partner.phone || "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatPercentage(partner.percentage)}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {partner.note || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {partner.active ? (
                        <Badge variant="secondary">فعال</Badge>
                      ) : (
                        <Badge variant="outline">غیرفعال</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(partner.createdAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(partner)}
                            title="ویرایش"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(partner)}
                            title={
                              partner.active ? "غیرفعال کردن" : "فعال کردن"
                            }
                          >
                            <Power
                              className={
                                partner.active
                                  ? "h-4 w-4 text-emerald-600"
                                  : "h-4 w-4 text-muted-foreground"
                              }
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePartner(partner)}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
              مجموع: {pagination.total.toLocaleString("fa-IR-u-nu-latn")} شریک
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || isLoading}
            >
              قبلی
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحه {pagination.page.toLocaleString("fa-IR")} از{" "}
              {pagination.totalPages.toLocaleString("fa-IR")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              بعدی
            </Button>
          </div>
        </div>
      </CardContent>

      <PartnerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        partner={editing}
        onSaved={refresh}
      />
    </Card>
  );
}
