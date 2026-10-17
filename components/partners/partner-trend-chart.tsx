// components/partners/partner-trend-chart.tsx
"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { PartnerTrendPoint } from "./partner-report-types";

const fmt = (n: number) => n.toLocaleString("fa-IR-u-nu-latn");

// پالت ثابت برای شرکا (برای ردیف «بدون شراکت» رنگ کهربایی)
const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#db2777",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#65a30d",
];

interface Props {
  data: PartnerTrendPoint[];
  granularity: "day" | "month";
}

export function PartnerTrendChart({ data, granularity }: Props) {
  const { buckets, partnerOrder, max } = useMemo(() => {
    const bucketSet = new Set<string>();
    const names: string[] = [];
    let maxVal = 1;

    for (const p of data) {
      bucketSet.add(p.bucket);
      const label = p.partnerName ?? "بدون شراکت";
      if (!names.includes(label)) names.push(label);
      const v = Number(p.revenue);
      if (v > maxVal) maxVal = v;
    }

    const buckets = Array.from(bucketSet).sort();
    // «بدون شراکت» همیشه آخر
    names.sort((a, b) => {
      if (a === "بدون شراکت") return 1;
      if (b === "بدون شراکت") return -1;
      return a.localeCompare(b, "fa");
    });

    return { buckets, partnerOrder: names, max: maxVal };
  }, [data]);

  if (data.length === 0 || buckets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
        <p>داده‌ای برای نمایش وجود ندارد</p>
        <p className="text-xs mt-1">
          اطلاعات فروش در بازه انتخاب شده یافت نشد
        </p>
      </div>
    );
  }

  const colorOf = (name: string) => {
    if (name === "بدون شراکت") return "#d97706";
    const idx = partnerOrder.indexOf(name);
    return PALETTE[idx % PALETTE.length];
  };

  const valueAt = (bucket: string, partnerName: string) => {
    const point = data.find(
      (p) =>
        p.bucket === bucket &&
        (p.partnerName ?? "بدون شراکت") === partnerName,
    );
    return point ? Number(point.revenue) : 0;
  };

  const labelOf = (bucket: string) => {
    // "YYYY-MM-DD" یا "YYYY-MM"
    const [, m, d] = bucket.split("-");
    if (granularity === "day") return `${d}/${m}`;
    return m; // فقط ماه برای بازه‌های بلند
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {partnerOrder.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: colorOf(name) }}
            />
            {name}
          </span>
        ))}
      </div>

      <div className="w-full h-56 flex items-end justify-between gap-1.5 pt-2 px-1 relative overflow-x-auto">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0.25, 0.5, 0.75, 1].map((line) => (
            <div
              key={line}
              className="border-t border-dashed border-border w-full"
            />
          ))}
        </div>

        {buckets.map((bucket) => (
          <div
            key={bucket}
            className="flex flex-col items-center flex-1 min-w-[28px] z-10"
          >
            <div className="flex items-end gap-0.5 w-full h-40 justify-center">
              {partnerOrder.map((name) => {
                const v = valueAt(bucket, name);
                const h = Math.max((v / max) * 100, v > 0 ? 3 : 0);
                return (
                  <div
                    key={name}
                    className="rounded-t transition-all duration-500 min-h-0 group relative"
                    style={{
                      height: `${h}%`,
                      width: `${Math.max(60 / partnerOrder.length, 6)}px`,
                      background: colorOf(name),
                    }}
                    title={`${name} — ${labelOf(bucket)}: ${fmt(v)} افغانی`}
                  >
                    {v > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                        {fmt(v)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {labelOf(bucket)}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        ستون‌ها: مبلغ فروش هر شریک به تفکیک{" "}
        {granularity === "day" ? "روز" : "ماه"}
      </p>
    </div>
  );
}
