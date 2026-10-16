// components/parts/external-payables-breakdown.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store } from "lucide-react";

interface SupplierPayable {
  supplierId: number | null;
  supplierName: string;
  lineCount: number;
  quantity: number;
  cost: number;
  sale: number;
  margin: number;
}

interface PayablesData {
  total: number;
  totalSale: number;
  margin: number;
  suppliers: SupplierPayable[];
}

const afn = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} افغانی`;

export function ExternalPayablesBreakdown({
  from,
  to,
  period,
}: {
  from?: string;
  to?: string;
  period?: string;
}) {
  const [data, setData] = useState<PayablesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (period) params.set("period", period);

    setIsLoading(true);
    fetch(`/api/suppliers/payables?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
      })
      .catch((e) => console.error("Error fetching payables:", e))
      .finally(() => setIsLoading(false));
  }, [from, to, period]);

  if (isLoading || !data || data.suppliers.length === 0) return null;

  return (
    <Card className="border-amber-300/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Store className="h-4 w-4 text-amber-600" />
          پرزه‌های خارجی — قابل پرداخت به فروشگاه‌ها
        </CardTitle>
        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
          {data.suppliers.length} فروشگاه
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>فروشگاه</TableHead>
              <TableHead className="text-center">تعداد</TableHead>
              <TableHead className="whitespace-nowrap">فروش پرزه خارجی</TableHead>
              <TableHead className="whitespace-nowrap">
                قابل پرداخت (بهای خرید)
              </TableHead>
              <TableHead className="whitespace-nowrap">سود</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.suppliers.map((s) => (
              <TableRow
                key={`${s.supplierId}-${s.supplierName}`}
                className="border-border"
              >
                <TableCell className="font-medium">{s.supplierName}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {s.quantity}
                </TableCell>
                <TableCell className="tabular-nums">{afn(s.sale)}</TableCell>
                <TableCell className="font-semibold tabular-nums text-amber-600">
                  {afn(s.cost)}
                </TableCell>
                <TableCell className="tabular-nums text-emerald-600">
                  {afn(s.margin)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-amber-50 dark:bg-amber-950/20">
            <TableRow>
              <TableCell className="font-semibold">جمع کل</TableCell>
              <TableCell />
              <TableCell className="font-semibold tabular-nums">
                {afn(data.totalSale)}
              </TableCell>
              <TableCell className="font-bold tabular-nums text-amber-600">
                {afn(data.total)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums text-emerald-600">
                {afn(data.margin)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
