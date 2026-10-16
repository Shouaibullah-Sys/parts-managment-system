// components/partners/partner-report-view.tsx
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import HijriDatePicker from "@/components/hijri-date-picker";
import Loader from "@/components/loader";
import { PartnerKpiCards } from "./partner-kpi-cards";
import { PartnerReportTable } from "./partner-report-table";
import { PartnerTrendChart } from "./partner-trend-chart";
import { PartnerDetailDialog } from "./partner-detail-dialog";
import type {
  PartnerReportData,
  PartnerSummaryRow,
} from "./partner-report-types";
import { exportPartnerReportExcel } from "@/lib/partner-excel";
interface PartnerOption {
  id: number;
  name: string;
}

export function PartnerReportView() {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(todayIso);
  const [partnerId, setPartnerId] = useState<string>("all");
  const [includeReturned, setIncludeReturned] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PartnerSummaryRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: partnersData } = useQuery({
    queryKey: ["partners-options"],
    queryFn: async () => {
      const res = await fetch("/api/partners?active=true&limit=1000", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("fetch partners failed");
      return res.json() as Promise<{ data: PartnerOption[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const params = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (partnerId !== "all") p.set("partnerId", partnerId);
    if (includeReturned) p.set("includeReturned", "true");
    return p.toString();
  }, [from, to, partnerId, includeReturned]);

  const {
    data: report,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["partner-report", params],
    queryFn: async (): Promise<PartnerReportData> => {
      const res = await fetch(`/api/partners/report?${params}`, {
        credentials: "include",
      });
      if (res.status === 403)
        throw new Error("فقط ادمین به گزارش سود دسترسی دارد");
      if (!res.ok) throw new Error("دریافت گزارش ناموفق بود");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا در گزارش");
      return json.data;
    },
    staleTime: 30 * 1000,
  });

  const partnerOptions = partnersData?.data ?? [];

  const selectedPartnerName =
    partnerId === "all"
      ? undefined
      : partnerId === "unassigned"
        ? "بدون شراکت"
        : partnerOptions.find((p) => String(p.id) === partnerId)?.name;

  const resetFilters = () => {
    setFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setTo(todayIso);
    setPartnerId("all");
    setIncludeReturned(false);
  };

  const handlePdfReport = async () => {
    if (!report) return;
    // پنجره را همان لحظهٔ کلیک باز می‌کنیم تا مسدودکنندهٔ پاپ‌آپ جلوی آن را نگیرد
    const tab = window.open("", "_blank");
    setExporting(true);
    try {
      const res = await fetch(`/api/partners/report/pdf?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("تولید فایل PDF ناموفق بود");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      // ۱) دانلود فایل
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `partner-report-${from}_${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // ۲) نمایش در تب جدید (مثل چاپ سوابق قطعات)
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");

      // فرصت کافی برای بارگذاری تب پیش از آزادسازی
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (tab) tab.close();
      console.error("Error exporting partner report PDF:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportPartnerReportExcel({
        rows: report.summary,
        totals: report.totals,
        parts: report.parts,
        customers: report.customers,
        trend: report.trend,
        granularity: report.granularity,
        from,
        to,
        partnerName: selectedPartnerName,
        includeReturned,
      });
    } catch (e) {
      console.error("Error exporting partner report:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* فیلترها */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">از تاریخ</Label>
              <HijriDatePicker value={from} onChange={setFrom} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تا تاریخ</Label>
              <HijriDatePicker value={to} onChange={setTo} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">شریک</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="همه شرکا" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه شرکا</SelectItem>
                  {partnerOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm cursor-pointer select-none">
              <Checkbox
                checked={includeReturned}
                onCheckedChange={(v) => setIncludeReturned(v === true)}
              />
              شامل فروش‌های مرتجع
            </label>
            <div className="flex items-center gap-2 pb-0.5 ms-auto">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                بازنشانی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                بروزرسانی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePdfReport}
                disabled={!report || exporting}
              >
                <Printer className="h-4 w-4" />
                چاپ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExcel}
                disabled={!report || exporting}
              >
                <FileSpreadsheet className="h-4 w-4" />
                اکسل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-destructive font-medium">
              {(error as Error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              تلاش دوباره
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Loader title="در حال محاسبهٔ گزارش شرکا..." subtitle="دریافت اطلاعات فروش و سود" size="sm" />
      ) : report ? (
        <>
          <PartnerKpiCards totals={report.totals} />

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  روند فروش به تفکیک شریک
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {report.granularity === "day" ? "روزانه" : "ماهانه"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PartnerTrendChart
                data={report.trend}
                granularity={report.granularity}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              خلاصه به تفکیک شریک
            </h2>
            <p className="text-xs text-muted-foreground">
              برای مشاهدهٔ جزئیات قطعات و مشتریان، روی ردیف کلیک کنید
            </p>
          </div>

          <PartnerReportTable
            rows={report.summary}
            totals={report.totals}
            selectedId={selectedRow?.id ?? null}
            onSelect={(row) => {
              setSelectedRow(row);
              setDialogOpen(true);
            }}
          />

          <PartnerDetailDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            row={selectedRow}
            report={report}
          />
        </>
      ) : null}
    </div>
  );
}
