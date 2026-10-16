// components/parts/parts-records-table.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Package,
  User,
  Calendar,
  FileText,
  Eye,
  Printer,
  Loader2,
  Search,
  X,
  Store,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Loader from "@/components/loader";

interface PartsRecordItem {
  id: number;
  name: string;
  partNumber: string;
  isExternal: boolean;
  supplierName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  cost: number | null;
}

interface PartsRecord {
  id: number;
  issueId: string;
  invoiceNumber: string;
  saleIds: number[];
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
  partNames: string[];
  items: PartsRecordItem[];
  itemCount: number;
  status: "completed" | "pending" | "approved";
}

type StatusFilter = "all" | "paid" | "debt";

const PAGE_SIZE = 25;

const afn = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} افغانی`;

const num = (v: string | number) => parseFloat(String(v) || "0") || 0;

export function PartsRecordsTable() {
  const [records, setRecords] = useState<PartsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<PartsRecord | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/parts/records?page=1&limit=10000");
        const result = await response.json();
        if (result.success) {
          setRecords(result.data || []);
        } else {
          setError("خطا در بارگذاری سوابق");
        }
      } catch (err) {
        console.error("Error fetching records:", err);
        setError("خطا در اتصال به سرور");
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // میان‌بر: فشردن "/" برای فوکوس روی جستجو
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const fuse = useMemo(
    () =>
      new Fuse(records, {
        keys: [
          "customerName",
          "normalizedName",
          "invoiceNumber",
          "partName",
          "partNumber",
          "issuedBy",
        ],
        threshold: 0.35,
        minMatchCharLength: 2,
        ignoreLocation: true,
      }),
    [records]
  );

  // جستجوی ترکیبی: اگر تطابق دقیق زیررشته پیدا شد همان‌ها؛ وگرنه نتایج
  // فازی (برای غلط تایپی). چون همهٔ شماره‌فاکتورها الگوی مشابه دارند،
  // جستجوی فازی روی شماره‌فاکتور نتایج نادرست می‌دهد؛ لذا فقط fallback است.
  const searched = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;

    const direct = records.filter((r) =>
      [
        r.customerName,
        r.normalizedName,
        r.invoiceNumber,
        r.partName,
        r.partNumber,
        r.issuedBy,
      ].some((field) => (field || "").toLowerCase().includes(q))
    );
    if (direct.length > 0) return direct;

    return fuse.search(q).map((r) => r.item);
  }, [fuse, records, searchTerm]);

  const filtered = useMemo(() => {
    if (statusFilter === "paid") return searched.filter((r) => r.isFullyPaid);
    if (statusFilter === "debt") return searched.filter((r) => !r.isFullyPaid);
    return searched;
  }, [searched, statusFilter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          acc.total += num(r.totalAmount);
          acc.paid += num(r.paidAmount);
          acc.outstanding += num(r.outstanding);
          return acc;
        },
        { total: 0, paid: 0, outstanding: 0 }
      ),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleDownloadPDF = async (record: PartsRecord) => {
    const saleIds = record.saleIds?.length ? record.saleIds : [record.id];
    try {
      const response = await fetch(
        `/api/issue-parts/${saleIds[0]}/pdf?saleIds=${saleIds.join(",")}`
      );
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${record.invoiceNumber || `invoice-${record.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("فاکتور دانلود شد");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("خطا در تولید فایل PDF");
    }
  };

  const statusChip = (record: PartsRecord) =>
    record.isFullyPaid ? (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
        <CheckCircle className="h-3 w-3" />
        پرداخت کامل
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="border-amber-500 text-amber-600 gap-1"
      >
        <AlertCircle className="h-3 w-3" />
        بدهکار
      </Badge>
    );

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "همه" },
    { key: "paid", label: "پرداخت‌شده" },
    { key: "debt", label: "بدهکار" },
  ];

  const detailInternal =
    selectedRecord?.items.filter((i) => !i.isExternal) ?? [];
  const detailExternal =
    selectedRecord?.items.filter((i) => i.isExternal) ?? [];
  const detailExternalPayable = detailExternal.reduce(
    (s, i) => s + (i.cost ?? 0) * i.quantity,
    0
  );
  const detailExternalMargin = detailExternal.reduce(
    (s, i) => s + i.total - (i.cost ?? 0) * i.quantity,
    0
  );

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="جستجو بر اساس مشتری، فاکتور، قطعه یا صادرکننده...  ( / )"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="پاک کردن جستجو"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            {filterButtons.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={statusFilter === f.key ? "default" : "ghost"}
                onClick={() => setStatusFilter(f.key)}
                className={
                  statusFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }
              >
                {f.label}
              </Button>
            ))}
          </div>
          <span className="hidden whitespace-nowrap text-sm text-muted-foreground sm:inline">
            {filtered.length} صدور
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Data grid ───────────────────────────────────────────── */}
      <Card className="border-mechanical shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader
                title="در حال بارگذاری سوابق..."
                subtitle="لطفاً منتظر بمانید"
                size="sm"
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>هیچ سابقه‌ای یافت نشد</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="hidden w-12 text-center sm:table-cell">
                    #
                  </TableHead>
                  <TableHead>مشتری / فاکتور</TableHead>
                  <TableHead className="hidden lg:table-cell">قطعات</TableHead>
                  <TableHead className="hidden text-center md:table-cell">
                    تعداد
                  </TableHead>
                  <TableHead className="hidden whitespace-nowrap md:table-cell">
                    تاریخ
                  </TableHead>
                  <TableHead className="whitespace-nowrap">مبلغ کل</TableHead>
                  <TableHead className="hidden whitespace-nowrap lg:table-cell">
                    پرداخت‌شده
                  </TableHead>
                  <TableHead className="hidden whitespace-nowrap lg:table-cell">
                    باقیمانده
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">وضعیت</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    صادرکننده
                  </TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((record, index) => (
                  <TableRow
                    key={record.issueId}
                    onClick={() => setSelectedRecord(record)}
                    className="group cursor-pointer border-border transition-colors hover:bg-accent/40"
                  >
                    <TableCell className="hidden text-center text-xs text-muted-foreground tabular-nums sm:table-cell">
                      {(safePage - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {record.customerName}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-primary">
                        {record.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[16rem]">
                        <div className="truncate font-medium">
                          {record.partNames?.[0] || record.partName}
                        </div>
                        {record.itemCount > 1 && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {record.itemCount} قلم
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-center tabular-nums md:table-cell">
                      {record.quantity}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(record.issueDate).toLocaleDateString("fa-IR")}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {afn(num(record.totalAmount))}
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-emerald-600 lg:table-cell">
                      {afn(num(record.paidAmount))}
                    </TableCell>
                    <TableCell className="hidden tabular-nums lg:table-cell">
                      <span
                        className={
                          record.isFullyPaid
                            ? "text-muted-foreground"
                            : "font-medium text-amber-600"
                        }
                      >
                        {afn(num(record.outstanding))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {statusChip(record)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        {record.issuedBy}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(record);
                          }}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden lg:inline">مشاهده</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(record);
                          }}
                          className="gap-1 text-primary hover:text-primary"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden lg:inline">چاپ</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Summary + pagination ────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              جمع کل:{" "}
              <strong className="tabular-nums">{afn(totals.total)}</strong>
            </span>
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              پرداخت‌شده:{" "}
              <strong className="tabular-nums text-emerald-600">
                {afn(totals.paid)}
              </strong>
            </span>
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              باقیمانده:{" "}
              <strong className="tabular-nums text-amber-600">
                {afn(totals.outstanding)}
              </strong>
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                صفحه {safePage} از {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                بعدی
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Detail dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  جزئیات صدور
                  <span className="font-mono text-sm text-primary">
                    {selectedRecord.invoiceNumber}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {selectedRecord.customerName} —{" "}
                  {new Date(selectedRecord.issueDate).toLocaleDateString("fa-IR")}
                </DialogDescription>
              </DialogHeader>

              {/* خلاصهٔ بل */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">مشتری</p>
                    <p className="font-medium">{selectedRecord.customerName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">صادرکننده</p>
                  <p className="font-medium">{selectedRecord.issuedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">قطعات انبار</p>
                  <p className="font-medium tabular-nums">
                    {detailInternal.length} قلم
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">پرزهٔ خارجی</p>
                  <p
                    className={`font-medium tabular-nums ${
                      detailExternal.length ? "text-amber-600" : ""
                    }`}
                  >
                    {detailExternal.length} قلم
                  </p>
                </div>
              </div>

              {/* جدول قطعات انبار */}
              {detailInternal.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-primary" />
                    قطعات انبار
                    <Badge variant="secondary" className="text-xs">
                      {detailInternal.length}
                    </Badge>
                  </h3>
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead>نام قطعه</TableHead>
                          <TableHead>کد قطعه</TableHead>
                          <TableHead className="text-center">تعداد</TableHead>
                          <TableHead className="whitespace-nowrap">
                            قیمت واحد
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            جمع
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailInternal.map((item, i) => (
                          <TableRow key={item.id} className="border-border">
                            <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.partNumber || "—"}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {afn(item.unitPrice)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-medium tabular-nums">
                              {afn(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* جدول پرزه‌های خارجی */}
              {detailExternal.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <Store className="h-4 w-4" />
                    پرزه‌های خارجی — خرید از فروشگاه دیگر
                    <Badge className="bg-amber-500 text-xs text-white hover:bg-amber-500">
                      {detailExternal.length}
                    </Badge>
                  </h3>
                  <div className="rounded-md border border-amber-300/60">
                    <Table>
                      <TableHeader className="bg-amber-50 dark:bg-amber-950/20">
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead>نام پرزه</TableHead>
                          <TableHead>فروشگاه</TableHead>
                          <TableHead className="text-center">تعداد</TableHead>
                          <TableHead className="whitespace-nowrap">
                            قیمت واحد
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            بهای خرید
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            جمع
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailExternal.map((item, i) => (
                          <TableRow key={item.id} className="border-border">
                            <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>
                            <TableCell>
                              {item.supplierName ? (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-amber-500 text-amber-600"
                                >
                                  <Store className="h-3 w-3" />
                                  {item.supplierName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {afn(item.unitPrice)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                              {item.cost != null ? afn(item.cost) : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-medium tabular-nums">
                              {afn(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20">
                    <span className="text-muted-foreground">
                      قابل پرداخت به فروشگاه‌های دیگر (بهای خرید):
                    </span>
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-bold tabular-nums text-amber-600">
                        {afn(detailExternalPayable)}
                      </span>
                      <span className="text-muted-foreground">
                        سود این پرزه‌ها:{" "}
                        <span className="font-medium tabular-nums text-emerald-600">
                          {afn(detailExternalMargin)}
                        </span>
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* اطلاعات مالی */}
              <div
                className={`grid gap-3 rounded-lg border border-border p-3 text-center ${
                  detailExternal.length > 0
                    ? "grid-cols-2 sm:grid-cols-4"
                    : "grid-cols-3"
                }`}
              >
                <div>
                  <p className="text-xs text-muted-foreground">مبلغ کل فاکتور</p>
                  <p className="font-bold tabular-nums">
                    {afn(num(selectedRecord.totalAmount))}
                  </p>
                </div>
                {detailExternal.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      خالص قابل وصول
                    </p>
                    <p className="font-bold tabular-nums">
                      {afn(
                        num(selectedRecord.totalAmount) - detailExternalPayable
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">پرداخت‌شده</p>
                  <p className="font-bold tabular-nums text-emerald-600">
                    {afn(num(selectedRecord.paidAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">باقیمانده</p>
                  <p
                    className={`font-bold tabular-nums ${
                      selectedRecord.isFullyPaid
                        ? "text-muted-foreground"
                        : "text-amber-600"
                    }`}
                  >
                    {afn(num(selectedRecord.outstanding))}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {statusChip(selectedRecord)}
                <Button
                  onClick={() => handleDownloadPDF(selectedRecord)}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  چاپ فاکتور
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
