// components/partners/partner-report-table.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Users } from "lucide-react";
import type {
  PartnerSummaryRow,
  PartnerReportTotals,
} from "./partner-report-types";

const fmt = (n: number) => n.toLocaleString("fa-IR");

type SortKey =
  | "name"
  | "salesCount"
  | "units"
  | "revenue"
  | "cogs"
  | "grossProfit"
  | "partnerShare"
  | "shopShare"
  | "paid"
  | "outstanding";

interface Props {
  rows: PartnerSummaryRow[];
  totals: PartnerReportTotals;
  onSelect: (row: PartnerSummaryRow) => void;
  selectedId: number | null;
}

export function PartnerReportTable({
  rows,
  totals,
  onSelect,
  selectedId,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = sortKey === "name" ? a.name : a[sortKey];
      const vb = sortKey === "name" ? b.name : b[sortKey];
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb), "fa");
      }
      return Number(va) - Number(vb);
    });
    return asc ? copy : copy.reverse();
  }, [rows, sortKey, asc]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const Th = ({ label, k, align = "left" }: { label: string; k: SortKey; align?: "left" | "right" }) => (
    <TableHead className={align === "right" ? "text-right" : "text-left"}>
      <button
        onClick={() => toggle(k)}
        className="inline-flex items-center gap-1 hover:text-foreground font-medium"
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );

  const hasUnassigned = rows.some((r) => r.id == null);

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <Th label="شریک" k="name" align="right" />
            <Th label="فاکتور" k="salesCount" align="right" />
            <Th label="تعداد" k="units" align="right" />
            <Th label="فروش" k="revenue" align="right" />
            <Th label="بهای تمام شده" k="cogs" align="right" />
            <Th label="سود ناخالص" k="grossProfit" align="right" />
            <TableHead className="text-right">درصد</TableHead>
            <Th label="سهم شریک" k="partnerShare" align="right" />
            <Th label="سهم مغازه" k="shopShare" align="right" />
            <Th label="وصول‌شده" k="paid" align="right" />
            <Th label="باقیمانده" k="outstanding" align="right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                داده‌ای در این بازه زمانی یافت نشد
              </TableCell>
            </TableRow>
          )}
          {sorted.map((r, i) => {
            const unassigned = r.id == null;
            const margin = r.revenue > 0 ? (r.grossProfit / r.revenue) * 100 : 0;
            return (
              <TableRow
                key={r.id ?? "unassigned"}
                onClick={() => onSelect(r)}
                className={`cursor-pointer ${
                  selectedId != null && selectedId === r.id
                    ? "bg-primary/5"
                    : ""
                } ${unassigned ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
              >
                <TableCell className="text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {unassigned && <Users className="h-3.5 w-3.5 text-amber-600" />}
                    {r.name}
                    {unassigned && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-400 text-amber-700"
                      >
                        بدون شراکت
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(r.salesCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(r.units)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmt(r.revenue)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmt(r.cogs)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-emerald-600">
                  {fmt(r.grossProfit)}
                  <span className="block text-[10px] text-muted-foreground font-normal">
                    {margin.toFixed(1)}٪
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="tabular-nums">
                    {r.percentage.toFixed(0)}٪
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-violet-600">
                  {fmt(r.partnerShare)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {fmt(r.shopShare)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">
                  {fmt(r.paid)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-amber-600">
                  {fmt(r.outstanding)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/50 font-bold">
              <td className="px-3 py-2 text-right">مجموع کل</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.salesCount)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.units)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.revenue)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.cogs)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                {fmt(totals.grossProfit)}
              </td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 text-right tabular-nums text-violet-600">
                {fmt(totals.partnerShare)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.shopShare)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.paid)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.outstanding)}</td>
            </tr>
          </tfoot>
        )}
      </Table>
      {hasUnassigned && (
        <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
          ردیف زرد = فروش قطعاتِ بدون شریک (به «بدون شراکت» تعلق می‌گیرد؛ سهمی
          از سود به شریک تعلق نمی‌گیرد).
        </p>
      )}
    </div>
  );
}
