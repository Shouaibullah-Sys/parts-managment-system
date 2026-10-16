// lib/partner-pdf.ts
// خروجی PDF گزارش فروش و سود شرکا — سرورساید (jsPDF)، راست‌چین و هم‌محتوای اکسل
// بخش‌ها: سرصفحه، شاخص‌های کلیدی، خلاصه شرکا، قطعات، مشتریان، روند، مشخصات
import { jsPDF } from "jspdf";
import {
  getCachedAssets,
  toEnglishDate,
  toEnglishNumber,
} from "@/lib/pdf-generator";
import type {
  PartnerReportData,
  PartnerSummaryRow,
  PartnerPartRow,
  PartnerCustomerRow,
  PartnerTrendPoint,
} from "@/components/partners/partner-report-types";

/* ----------------------------- palette ----------------------------- */
const NAVY: [number, number, number] = [22, 50, 79];
const NAVY_2: [number, number, number] = [36, 80, 124];
const GREEN: [number, number, number] = [21, 115, 71];
const AMBER: [number, number, number] = [176, 106, 9];
const INK: [number, number, number] = [42, 42, 42];
const MUTED: [number, number, number] = [110, 110, 110];
const BORDER: [number, number, number] = [201, 210, 222];
const WHITE: [number, number, number] = [255, 255, 255];
const TOTAL_BG: [number, number, number] = [214, 226, 240];
const ZEBRA: [number, number, number] = [247, 249, 252];

/* ----------------------------- formatters ----------------------------- */
const num = (v: number | string) => Number(v) || 0;
const money = (v: number | string) =>
  num(v).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const int = (v: number | string) => Math.round(num(v)).toLocaleString("en-US");
const pctOf = (n: number, d: number) =>
  d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "0.0%";
const pct = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;

/* ----------------------------- table model ----------------------------- */
type Align = "right" | "center" | "left";

interface Col<T> {
  label: string;
  w: number;
  align: Align;
  get: (row: T, index: number) => string;
  color?: [number, number, number];
}

interface Range {
  left: number;
  right: number;
  w: number;
}

/* ----------------------------- generator ----------------------------- */
export async function generatePartnerReportPdf(
  data: PartnerReportData,
  opts: {
    from: string;
    to: string;
    partnerName?: string;
    includeReturned?: boolean;
  },
): Promise<Uint8Array> {
  const { from, to, partnerName, includeReturned } = opts;
  const now = new Date();

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const contentW = W - M * 2;
  const ROW_H = 15;
  const bottomLimit = () => H - 44;
  const rangeLabel = `${from} — ${to}`;
  const partnerLabelText = partnerName || "همه شرکا";

  /* fonts */
  const assets = await getCachedAssets();
  let fontLoaded = false;
  let boldLoaded = false;
  if (assets.font) {
    try {
      doc.addFileToVFS("vazirmatn.ttf", assets.font);
      doc.addFont("vazirmatn.ttf", "vazirmatn", "normal");
      fontLoaded = true;
    } catch {
      /* ignore */
    }
  }
  if (assets.fontBold) {
    try {
      doc.addFileToVFS("vazirmatn-bold.ttf", assets.fontBold);
      doc.addFont("vazirmatn-bold.ttf", "vazirmatn", "bold");
      boldLoaded = true;
    } catch {
      /* ignore */
    }
  }
  const FONT = fontLoaded ? "vazirmatn" : "helvetica";
  const FONT_BOLD = boldLoaded ? "vazirmatn" : FONT;
  const bold = (on: boolean) => doc.setFont(on ? FONT_BOLD : FONT, on ? "bold" : "normal");

  let y = 0;
  const ensure = (h: number) => {
    if (y + h > bottomLimit()) newPage();
  };

  const newPage = () => {
    doc.addPage();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 28, "F");
    bold(true);
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text("راپور فروش و سود شرکا", M, 18, { align: "left" });
    bold(false);
    doc.setFontSize(9);
    doc.setTextColor(205, 215, 230);
    doc.text(rangeLabel, W - M, 18, { align: "right" });
    y = 48;
  };

  const firstHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 54, "F");
    bold(true);
    doc.setFontSize(16);
    doc.setTextColor(...WHITE);
    doc.text("راپور فروش و سود شرکا", W / 2, 24, { align: "center" });
    doc.setFontSize(11);
    doc.text("دیپلماسی لمتید", W - M, 22, { align: "right" });
    bold(false);
    doc.setFontSize(9);
    doc.setTextColor(205, 215, 230);
    doc.text(rangeLabel, M, 43, { align: "left" });
    doc.text(`شریک: ${partnerLabelText}`, W - M, 43, { align: "right" });
    y = 54 + 20;
  };

  /* x-layout: columns are given in RTL reading order; laid out from the right */
  const layout = (cols: Col<unknown>[]): Range[] => {
    const total = cols.reduce((s, c) => s + c.w, 0) || 1;
    const xs: Range[] = [];
    let xRight = W - M;
    for (const c of cols) {
      const w = (c.w / total) * contentW;
      xs.push({ left: xRight - w, right: xRight, w });
      xRight -= w;
    }
    return xs;
  };

  const sectionBar = (title: string) => {
    ensure(20 + 18 + ROW_H);
    doc.setFillColor(...NAVY_2);
    doc.rect(M, y, contentW, 20, "F");
    bold(true);
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(title, W - M - 8, y + 14, { align: "right" });
    bold(false);
    y += 20;
  };

  const headerRow = (cols: Col<unknown>[]) => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, contentW, 18, "F");
    bold(true);
    const xs = layout(cols);
    cols.forEach((c, i) => {
      const cx = xs[i];
      let size = 8;
      doc.setFontSize(size);
      while (doc.getTextWidth(c.label) > cx.w - 6 && size > 6) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      doc.setTextColor(...WHITE);
      const x =
        c.align === "right"
          ? cx.right - 4
          : c.align === "left"
            ? cx.left + 4
            : (cx.left + cx.right) / 2;
      doc.text(c.label, x, y + 12.5, { align: c.align });
    });
    bold(false);
    y += 18;
  };

  const dataRow = (
    cols: Col<unknown>[],
    values: string[],
    o?: { fill?: [number, number, number]; boldRow?: boolean },
  ) => {
    if (o?.fill) {
      doc.setFillColor(...o.fill);
      doc.rect(M, y, contentW, ROW_H, "F");
    }
    doc.setDrawColor(...BORDER);
    doc.line(M, y + ROW_H, M + contentW, y + ROW_H);
    const xs = layout(cols);
    bold(!!o?.boldRow);
    cols.forEach((c, i) => {
      const v = values[i] ?? "";
      let size = 8;
      doc.setFontSize(size);
      while (doc.getTextWidth(v) > xs[i].w - 8 && size > 5.5) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      doc.setTextColor(...(o?.boldRow ? NAVY : (c.color ?? INK)));
      const x =
        c.align === "right"
          ? xs[i].right - 4
          : c.align === "left"
            ? xs[i].left + 4
            : (xs[i].left + xs[i].right) / 2;
      doc.text(v, x, y + ROW_H - 4, { align: c.align });
    });
    bold(false);
    y += ROW_H;
  };

  const renderTable = <T,>(
    title: string,
    cols: Col<T>[],
    rows: T[],
    totalRow?: string[] | null,
  ) => {
    const c = cols as unknown as Col<unknown>[];
    sectionBar(title);
    headerRow(c);
    rows.forEach((r, idx) => {
      if (y + ROW_H > bottomLimit()) {
        newPage();
        headerRow(c);
      }
      dataRow(c, cols.map((col) => col.get(r, idx)), {
        fill: idx % 2 === 1 ? ZEBRA : undefined,
      });
    });
    if (rows.length === 0) {
      dataRow(c, ["داده‌ای در این بازه زمانی یافت نشد"]);
    }
    if (totalRow) {
      if (y + ROW_H > bottomLimit()) {
        newPage();
        headerRow(c);
      }
      dataRow(c, totalRow, { fill: TOTAL_BG, boldRow: true });
    }
    y += 10;
  };

  /* partner lookup */
  const nameById = new Map<string, string>();
  const pctById = new Map<string, number>();
  for (const s of data.summary) {
    const key = String(s.id ?? "unassigned");
    nameById.set(key, s.name);
    pctById.set(key, s.percentage);
  }
  const partnerKey = (id: number | null) => String(id ?? "unassigned");
  const partnerLabel = (id: number | null, name?: string | null) =>
    name ?? nameById.get(partnerKey(id)) ?? "بدون شراکت";

  /* ----------------------------- page ----------------------------- */
  firstHeader();

  /* KPI metrics */
  const metrics = [
    { label: "مجموع فروش", value: money(data.totals.revenue), color: NAVY },
    { label: "بهای تمام شده", value: money(data.totals.cogs), color: NAVY_2 },
    { label: "سود ناخالص", value: money(data.totals.grossProfit), color: GREEN },
    { label: "سهم شرکا", value: money(data.totals.partnerShare), color: GREEN },
    { label: "پرداخت شده", value: money(data.totals.paid), color: NAVY_2 },
    { label: "باقی‌مانده", value: money(data.totals.outstanding), color: AMBER },
  ];
  const gap = 8;
  const boxW = (contentW - gap * (metrics.length - 1)) / metrics.length;
  const boxH = 46;
  metrics.forEach((m, i) => {
    const xRight = W - M - i * (boxW + gap);
    const x = xRight - boxW;
    doc.setFillColor(...ZEBRA);
    doc.rect(x, y, boxW, boxH, "F");
    doc.setFillColor(...m.color);
    doc.rect(xRight - 3, y, 3, boxH, "F");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    bold(false);
    doc.text(m.label, x + boxW - 8, y + 17, { align: "right" });
    doc.setFontSize(12);
    bold(true);
    doc.setTextColor(...m.color);
    doc.text(m.value, x + boxW - 8, y + 37, { align: "right" });
  });
  bold(false);
  y += boxH + 16;

  /* ۱) خلاصه شرکا */
  const summaryCols: Col<PartnerSummaryRow>[] = [
    { label: "#", w: 3, align: "center", get: (_r, i) => int(i + 1) },
    { label: "شریک", w: 16, align: "right", get: (r) => r.name },
    { label: "تعداد فاکتور", w: 7, align: "center", get: (r) => int(r.salesCount) },
    { label: "تعداد", w: 6, align: "center", get: (r) => int(r.units) },
    { label: "فروش", w: 11, align: "center", get: (r) => money(r.revenue) },
    { label: "بهای تمام شده", w: 12, align: "center", get: (r) => money(r.cogs) },
    { label: "سود ناخالص", w: 11, align: "center", color: GREEN, get: (r) => money(r.grossProfit) },
    { label: "حاشیه سود", w: 7, align: "center", get: (r) => pctOf(r.grossProfit, r.revenue) },
    { label: "درصد شریک", w: 7, align: "center", get: (r) => pct(r.percentage) },
    { label: "سهم شریک", w: 11, align: "center", color: GREEN, get: (r) => money(r.partnerShare) },
    { label: "سهم مغازه", w: 11, align: "center", get: (r) => money(r.shopShare) },
    { label: "پرداخت شده", w: 11, align: "center", get: (r) => money(r.paid) },
    { label: "باقی‌مانده", w: 11, align: "center", color: AMBER, get: (r) => money(r.outstanding) },
    { label: "مرتجع", w: 6, align: "center", get: (r) => int(r.returnedCount) },
  ];
  renderTable("۱) خلاصه به تفکیک شریک", summaryCols, data.summary, [
    "",
    "مجموع کل",
    int(data.totals.salesCount),
    int(data.totals.units),
    money(data.totals.revenue),
    money(data.totals.cogs),
    money(data.totals.grossProfit),
    pctOf(data.totals.grossProfit, data.totals.revenue),
    "",
    money(data.totals.partnerShare),
    money(data.totals.shopShare),
    money(data.totals.paid),
    money(data.totals.outstanding),
    int(data.totals.returnedCount),
  ]);

  /* ۲) قطعات */
  const partTotals = data.parts.reduce(
    (acc, p) => {
      const rev = num(p.revenue);
      const cogs = num(p.cogs);
      const gross = rev - cogs;
      const share = (gross * (pctById.get(partnerKey(p.partnerId)) ?? 0)) / 100;
      acc.quantity += p.quantity;
      acc.revenue += rev;
      acc.cogs += cogs;
      acc.gross += gross;
      acc.partnerShare += share;
      return acc;
    },
    { quantity: 0, revenue: 0, cogs: 0, gross: 0, partnerShare: 0 },
  );

  const partsCols: Col<PartnerPartRow>[] = [
    { label: "#", w: 3, align: "center", get: (_r, i) => int(i + 1) },
    { label: "شریک", w: 14, align: "right", get: (r) => partnerLabel(r.partnerId, r.partnerName) },
    { label: "شماره قطعه", w: 12, align: "center", get: (r) => r.partNumber },
    { label: "نام قطعه", w: 24, align: "right", get: (r) => r.partName },
    { label: "تعداد", w: 6, align: "center", get: (r) => int(r.quantity) },
    { label: "فروش", w: 11, align: "center", get: (r) => money(r.revenue) },
    { label: "بهای تمام شده", w: 12, align: "center", get: (r) => money(r.cogs) },
    {
      label: "سود ناخالص",
      w: 11,
      align: "center",
      color: GREEN,
      get: (r) => money(num(r.revenue) - num(r.cogs)),
    },
    {
      label: "حاشیه سود",
      w: 7,
      align: "center",
      get: (r) => pctOf(num(r.revenue) - num(r.cogs), num(r.revenue)),
    },
    {
      label: "درصد شریک",
      w: 7,
      align: "center",
      get: (r) => pct(pctById.get(partnerKey(r.partnerId)) ?? 0),
    },
    {
      label: "سهم شریک",
      w: 11,
      align: "center",
      color: GREEN,
      get: (r) => money((num(r.revenue) - num(r.cogs)) * (pctById.get(partnerKey(r.partnerId)) ?? 0) / 100),
    },
    {
      label: "سهم مغازه",
      w: 11,
      align: "center",
      get: (r) => {
        const g = num(r.revenue) - num(r.cogs);
        return money(g - (g * (pctById.get(partnerKey(r.partnerId)) ?? 0)) / 100);
      },
    },
  ];
  renderTable("۲) جزئیات کامل قطعات", partsCols, data.parts, [
    "",
    "",
    "",
    "مجموع کل",
    int(partTotals.quantity),
    money(partTotals.revenue),
    money(partTotals.cogs),
    money(partTotals.gross),
    pctOf(partTotals.gross, partTotals.revenue),
    "",
    money(partTotals.partnerShare),
    money(partTotals.gross - partTotals.partnerShare),
  ]);

  /* ۳) مشتریان */
  const custTotals = data.customers.reduce(
    (acc, c) => {
      acc.salesCount += c.salesCount;
      acc.revenue += num(c.revenue);
      acc.outstanding += num(c.outstanding);
      return acc;
    },
    { salesCount: 0, revenue: 0, outstanding: 0 },
  );
  const customerCols: Col<PartnerCustomerRow>[] = [
    { label: "#", w: 4, align: "center", get: (_r, i) => int(i + 1) },
    { label: "شریک", w: 22, align: "right", get: (r) => partnerLabel(r.partnerId, r.partnerName) },
    { label: "مشتری", w: 30, align: "right", get: (r) => r.customerName ?? "نامشخص" },
    { label: "تعداد فاکتور", w: 12, align: "center", get: (r) => int(r.salesCount) },
    { label: "مبلغ فروش", w: 16, align: "center", get: (r) => money(r.revenue) },
    { label: "باقی‌مانده", w: 16, align: "center", color: AMBER, get: (r) => money(r.outstanding) },
  ];
  renderTable("۳) جزئیات مشتریان", customerCols, data.customers, [
    "",
    "",
    "مجموع کل",
    int(custTotals.salesCount),
    money(custTotals.revenue),
    money(custTotals.outstanding),
  ]);

  /* ۴) روند */
  const trendTotals = data.trend.reduce(
    (acc, t) => {
      const rev = num(t.revenue);
      const cogs = num(t.cogs);
      acc.salesCount += t.salesCount;
      acc.revenue += rev;
      acc.cogs += cogs;
      acc.gross += rev - cogs;
      return acc;
    },
    { salesCount: 0, revenue: 0, cogs: 0, gross: 0 },
  );
  const trendCols: Col<PartnerTrendPoint>[] = [
    { label: "#", w: 4, align: "center", get: (_r, i) => int(i + 1) },
    { label: "بازه", w: 14, align: "center", get: (r) => r.bucket },
    { label: "شریک", w: 22, align: "right", get: (r) => r.partnerName ?? "بدون شراکت" },
    { label: "تعداد فاکتور", w: 12, align: "center", get: (r) => int(r.salesCount) },
    { label: "فروش", w: 16, align: "center", get: (r) => money(r.revenue) },
    { label: "بهای تمام شده", w: 16, align: "center", get: (r) => money(r.cogs) },
    {
      label: "سود ناخالص",
      w: 16,
      align: "center",
      color: GREEN,
      get: (r) => money(num(r.revenue) - num(r.cogs)),
    },
  ];
  renderTable(
    `۴) روند فروش (${data.granularity === "day" ? "روزانه" : "ماهانه"})`,
    trendCols,
    data.trend,
    [
      "",
      "",
      "مجموع کل",
      int(trendTotals.salesCount),
      money(trendTotals.revenue),
      money(trendTotals.cogs),
      money(trendTotals.gross),
    ],
  );

  /* ۵) مشخصات */
  sectionBar("۵) مشخصات گزارش");
  const metaLines = [
    `از تاریخ: ${from}    تا تاریخ: ${to}`,
    `شریک: ${partnerLabelText}`,
    `شامل فروش‌های مرتجع: ${includeReturned ? "بله" : "خیر"}`,
    `دانه‌بندی روند: ${data.granularity === "day" ? "روزانه" : "ماهانه"}`,
    `تعداد شرکا: ${int(data.summary.length)}    تعداد اقلام قطعات: ${int(data.parts.length)}    تعداد ردیف‌های مشتریان: ${int(data.customers.length)}`,
    "سهم شریک = سود ناخالص × درصد شریک    •    سهم مغازه = سود ناخالص − سهم شریک",
    "فروش‌های مرتجع (در صورت انتخاب نشدن) در محاسبات لحاظ نشده‌اند.",
  ];
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  for (const line of metaLines) {
    ensure(14);
    doc.text(line, W - M, y + 10, { align: "right" });
    y += 14;
  }

  /* page numbers + footer */
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.line(M, H - 30, W - M, H - 30);
    bold(false);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "دیپلوماسی لمتید — راپور فروش و سود شرکا",
      W / 2,
      H - 18,
      { align: "center" },
    );
    doc.setTextColor(120, 120, 120);
    doc.text(toEnglishDate(now), M, H - 18, { align: "left" });
    doc.text(`${toEnglishNumber(p)} / ${toEnglishNumber(pageCount)}`, W - M, H - 18, {
      align: "right",
    });
  }

  const buffer = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buffer);
}
