// components/partners/partner-kpi-cards.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  HandCoins,
  Store,
} from "lucide-react";
import type { PartnerReportTotals } from "./partner-report-types";

const fmt = (n: number) => n.toLocaleString("fa-IR");

interface Props {
  totals: PartnerReportTotals;
}

export function PartnerKpiCards({ totals }: Props) {
  const margin =
    totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0;

  const cards = [
    {
      label: "مجموع فروش",
      value: fmt(totals.revenue),
      hint: `${fmt(totals.salesCount)} فاکتور • ${fmt(totals.units)} واحد`,
      icon: ShoppingCart,
      tone: "text-blue-600",
    },
    {
      label: "بهای تمام شده",
      value: fmt(totals.cogs),
      hint: "COGS فروش‌های غیرمرتجع",
      icon: TrendingDown,
      tone: "text-amber-600",
    },
    {
      label: "سود ناخالص",
      value: fmt(totals.grossProfit),
      hint: `حاشیه ${margin.toFixed(1)}٪`,
      icon: TrendingUp,
      tone: "text-emerald-600",
    },
    {
      label: "سهم شرکا",
      value: fmt(totals.partnerShare),
      hint: "سود ناخالص × درصد هر شریک",
      icon: HandCoins,
      tone: "text-violet-600",
    },
    {
      label: "سهم مغازه",
      value: fmt(totals.shopShare),
      hint: "باقی‌ماندهٔ سود پس از سهم شرکا",
      icon: Store,
      tone: "text-slate-600",
    },
    {
      label: "وصول‌شده / باقیمانده",
      value: `${fmt(totals.paid)} / ${fmt(totals.outstanding)}`,
      hint: "مبلغ دریافتی و بدهی مشتریان",
      icon: Wallet,
      tone: "text-cyan-600",
      wide: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={`py-3 ${c.wide ? "col-span-2 lg:col-span-3 xl:col-span-1" : ""}`}
        >
          <CardContent className="px-4 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 shrink-0 ${c.tone}`} />
            </div>
            <div className="text-lg font-bold tabular-nums break-all">
              {c.value}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              {c.label === "سود ناخالص" && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-emerald-300 text-emerald-700"
                >
                  {margin.toFixed(1)}٪
                </Badge>
              )}
              <span>{c.hint}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
