// components/partners/partner-detail-dialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PartnerSummaryRow,
  PartnerReportData,
} from "./partner-report-types";

const fmt = (n: number | string) => Number(n).toLocaleString("fa-IR-u-nu-latn");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PartnerSummaryRow | null;
  report: PartnerReportData | null;
}

export function PartnerDetailDialog({ open, onOpenChange, row, report }: Props) {
  if (!row) return null;

  const key = row.id != null ? String(row.id) : "unassigned";
  const partRows = report?.partsByPartner?.[key] ?? [];
  const customerRows = report?.customersByPartner?.[key] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            جزئیات فروش و سود
            <span className="font-bold text-primary">{row.name}</span>
            <Badge variant="secondary" className="tabular-nums">
              {row.percentage.toFixed(0)}٪
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {fmt(row.salesCount)} فاکتور • {fmt(row.units)} واحد • فروش{" "}
            {fmt(row.revenue)} • سود ناخالص {fmt(row.grossProfit)} • سهم شریک{" "}
            {fmt(row.partnerShare)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="parts" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parts">قطعات ({fmt(partRows.length)})</TabsTrigger>
            <TabsTrigger value="customers">
              مشتریان ({fmt(customerRows.length)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parts" className="mt-3">
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">قطعه</TableHead>
                    <TableHead className="text-right">شماره قطعه</TableHead>
                    <TableHead className="text-right">تعداد</TableHead>
                    <TableHead className="text-right">فروش</TableHead>
                    <TableHead className="text-right">بهای تمام شده</TableHead>
                    <TableHead className="text-right">سود ناخالص</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partRows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-6"
                      >
                        قطعه‌ای در این بازه فروخته نشده است
                      </TableCell>
                    </TableRow>
                  )}
                  {partRows.map((p, i) => {
                    const revenue = Number(p.revenue);
                    const cogs = Number(p.cogs);
                    return (
                      <TableRow key={`${p.partId ?? p.partName}-${i}`}>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {p.partName}
                        </TableCell>
                        <TableCell className="text-right mono text-xs text-muted-foreground">
                          {p.partNumber}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmt(p.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmt(revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {fmt(cogs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-emerald-600">
                          {fmt(revenue - cogs)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {partRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/50 font-bold">
                      <td colSpan={3} className="px-3 py-2 text-right">
                        مجموع
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmt(partRows.reduce((s, p) => s + p.quantity, 0))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmt(
                          partRows.reduce((s, p) => s + Number(p.revenue), 0),
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmt(partRows.reduce((s, p) => s + Number(p.cogs), 0))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                        {fmt(
                          partRows.reduce(
                            (s, p) => s + Number(p.revenue) - Number(p.cogs),
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-3">
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">تعداد فاکتور</TableHead>
                    <TableHead className="text-right">مبلغ فروش</TableHead>
                    <TableHead className="text-right">باقیمانده</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerRows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-6"
                      >
                        مشتری‌ای در این بازه ثبت نشده است
                      </TableCell>
                    </TableRow>
                  )}
                  {customerRows.map((c, i) => (
                    <TableRow key={`${c.customerId ?? c.customerName}-${i}`}>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {c.customerName ?? "نامشخص"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(c.salesCount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(c.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {fmt(c.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
