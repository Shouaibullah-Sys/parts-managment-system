// lib/sales-report-pdf.ts
// راپور فروش و راپور مرجوعیات — سرورساید (jsPDF)، راست‌چین و افقی
import { jsPDF } from "jspdf";
import {
  getCachedAssets,
  toEnglishDate,
  toEnglishNumber,
} from "@/lib/pdf-generator";
import type { SalesQueryRow, SalesQuerySummary } from "@/lib/sales-query";

/* palette */
const NAVY: [number, number, number] = [22, 50, 79];
const NAVY_2: [number, number, number] = [36, 80, 124];
const GREEN: [number, number, number] = [21, 115, 71];
const AMBER: [number, number, number] = [176, 106, 9];
const RED: [number, number, number] = [176, 42, 42];
const INK: [number, number, number] = [42, 42, 42];
const MUTED: [number, number, number] = [110, 110, 110];
const BORDER: [number, number, number] = [201, 210, 222];
const WHITE: [number, number, number] = [255, 255, 255];
const TOTAL_BG: [number, number, number] = [214, 226, 240];
const ZEBRA: [number, number, number] = [247, 249, 252];

type RGB = [number, number, number];
type Align = "right" | "center" | "left";

const num = (v: unknown) => Number(v) || 0;
const money = (v: unknown) =>
  num(v).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const int = (v: unknown) => Math.round(num(v)).toLocaleString("en-US");

// "yyyy-MM-dd" -> شمسی (Hijri Shamsi); avoids UTC off-by-one of new Date(string)
const hijri = (d: string) => {
  if (!d) return "…";
  const [y, m, day] = d.split("-").map(Number);
  if (!y) return d;
  return toEnglishDate(new Date(y, (m || 1) - 1, day || 1));
};

const hijriRange = (from: string, to: string) =>
  `${hijri(from)} — ${hijri(to)}`;

export interface ReportCol<T> {
  label: string;
  w: number;
  align: Align;
  get: (row: T, index: number) => string;
  color?: RGB;
}
export interface ReportSection {
  title: string;
  cols: ReportCol<any>[];
  rows: any[];
  totalRow?: string[] | null;
}
export interface ReportMetric {
  label: string;
  value: string;
  color: RGB;
}

interface Range {
  left: number;
  right: number;
  w: number;
}

async function renderReport(opts: {
  title: string;
  rangeLabel: string;
  metrics: ReportMetric[];
  sections: ReportSection[];
  metaLines: string[];
}): Promise<Uint8Array> {
  const { title, rangeLabel, metrics, sections, metaLines } = opts;
  const now = new Date();

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const contentW = W - M * 2;
  const ROW_H = 15;
  const bottomLimit = () => H - 44;

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
  const bold = (on: boolean) =>
    doc.setFont(on ? FONT_BOLD : FONT, on ? "bold" : "normal");

  let y = 0;

  const newPage = () => {
    doc.addPage();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 28, "F");
    bold(true);
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(title, M, 18, { align: "left" });
    bold(false);
    doc.setFontSize(9);
    doc.setTextColor(205, 215, 230);
    doc.text(rangeLabel, W - M, 18, { align: "right" });
    y = 48;
  };
  const ensure = (h: number) => {
    if (y + h > bottomLimit()) newPage();
  };

  const layout = (cols: ReportCol<any>[]): Range[] => {
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

  const sectionBar = (t: string) => {
    ensure(20 + 18 + ROW_H);
    doc.setFillColor(...NAVY_2);
    doc.rect(M, y, contentW, 20, "F");
    bold(true);
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(t, W - M - 8, y + 14, { align: "right" });
    bold(false);
    y += 20;
  };

  const headerRow = (cols: ReportCol<any>[]) => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, contentW, 18, "F");
    bold(true);
    const xs = layout(cols);
    cols.forEach((c, i) => {
      let size = 8;
      doc.setFontSize(size);
      while (doc.getTextWidth(c.label) > xs[i].w - 6 && size > 6) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      doc.setTextColor(...WHITE);
      const x =
        c.align === "right"
          ? xs[i].right - 4
          : c.align === "left"
            ? xs[i].left + 4
            : (xs[i].left + xs[i].right) / 2;
      doc.text(c.label, x, y + 12.5, { align: c.align });
    });
    bold(false);
    y += 18;
  };

  const dataRow = (
    cols: ReportCol<any>[],
    values: string[],
    o?: { fill?: RGB; boldRow?: boolean },
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

  /* ----------------------------- content ----------------------------- */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 54, "F");
  bold(true);
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(title, W / 2, 24, { align: "center" });
  doc.setFontSize(11);
  doc.text("دیپلماسی لمتید", W - M, 22, { align: "right" });
  bold(false);
  doc.setFontSize(9);
  doc.setTextColor(205, 215, 230);
  doc.text(rangeLabel, M, 43, { align: "left" });
  y = 54 + 20;

  /* شاخص‌ها */
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
    doc.setFontSize(11);
    bold(true);
    doc.setTextColor(...m.color);
    doc.text(m.value, x + boxW - 8, y + 37, { align: "right" });
  });
  bold(false);
  y += boxH + 16;

  for (const s of sections) {
    sectionBar(s.title);
    headerRow(s.cols);
    s.rows.forEach((r, idx) => {
      if (y + ROW_H > bottomLimit()) {
        newPage();
        headerRow(s.cols);
      }
      dataRow(s.cols, s.cols.map((col) => col.get(r, idx)), {
        fill: idx % 2 === 1 ? ZEBRA : undefined,
      });
    });
    if (s.rows.length === 0) {
      dataRow(s.cols, ["داده‌ای در این بازه یافت نشد"]);
    }
    if (s.totalRow) {
      if (y + ROW_H > bottomLimit()) {
        newPage();
        headerRow(s.cols);
      }
      dataRow(s.cols, s.totalRow, { fill: TOTAL_BG, boldRow: true });
    }
    y += 10;
  }

  /* مشخصات */
  sectionBar("مشخصات گزارش");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  for (const line of metaLines) {
    ensure(14);
    doc.text(line, W - M, y + 10, { align: "right" });
    y += 14;
  }

  /* footer + page numbers */
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.line(M, H - 30, W - M, H - 30);
    bold(false);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(title, W / 2, H - 18, { align: "center" });
    doc.setTextColor(120, 120, 120);
    doc.text(toEnglishDate(now), M, H - 18, { align: "left" });
    doc.text(
      `${toEnglishNumber(p)} / ${toEnglishNumber(pageCount)}`,
      W - M,
      H - 18,
      { align: "right" },
    );
  }

  const buffer = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buffer);
}

/* ------------------------------ sales ------------------------------ */
export interface SalesReportData {
  rows: SalesQueryRow[];
  summary: SalesQuerySummary;
  from: string;
  to: string;
  filters: { paymentStatus?: string; search?: string };
}

const hdate = (d: unknown) => (d ? toEnglishDate(new Date(d as string)) : "—");

export async function generateSalesReportPdf(
  data: SalesReportData,
): Promise<Uint8Array> {
  const { rows, summary, from, to, filters } = data;
  const rangeLabel = hijriRange(from, to);

  const metrics: ReportMetric[] = [
    { label: "تعداد معاملات", value: int(summary.count), color: NAVY },
    { label: "مجموع فروش (خالص)", value: money(summary.totalSales), color: NAVY },
    { label: "فروش ناخالص", value: money(summary.grossSales), color: NAVY_2 },
    { label: "بهای پرزه‌های خارجی", value: money(summary.externalPayable), color: NAVY_2 },
    { label: "پرداخت شده", value: money(summary.totalPaid), color: GREEN },
    { label: "باقی‌مانده", value: money(summary.totalOutstanding), color: AMBER },
  ];
  if ((summary.totalRefunds ?? 0) > 0) {
    metrics.push({ label: "بازپرداخت مرجوعی", value: money(summary.totalRefunds), color: RED });
  }

  const cols: ReportCol<SalesQueryRow>[] = [
    { label: "#", w: 3, align: "center", get: (_r, i) => int(i + 1) },
    { label: "مشتری", w: 15, align: "right", get: (r) => r.customerName || "نامشخص" },
    { label: "قطعه", w: 15, align: "right", get: (r) => r.partName || "—" },
    { label: "شماره قطعه", w: 9, align: "center", get: (r) => r.partNumber || "—" },
    { label: "شریک", w: 10, align: "right", color: GREEN, get: (r) => r.partnerName || "بدون شراکت" },
    { label: "تعداد", w: 5, align: "center", get: (r) => int(r.quantity) },
    { label: "تاریخ", w: 9, align: "center", get: (r) => hdate(r.issueDate) },
    { label: "مبلغ کل", w: 10, align: "center", get: (r) => money(r.grossAmount) },
    { label: "پرداخت شده", w: 10, align: "center", color: GREEN, get: (r) => money(r.paidAmount) },
    { label: "باقی‌مانده", w: 10, align: "center", color: AMBER, get: (r) => money(r.outstanding) },
    { label: "وضعیت", w: 8, align: "center", get: (r) => (r.isFullyPaid ? "پرداخت کامل" : "بدهکار") },
    { label: "صادر کننده", w: 10, align: "right", get: (r) => r.issuedBy || "نامشخص" },
  ];

  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const paymentLabel =
    filters.paymentStatus === "paid"
      ? "فقط پرداخت‌شده"
      : filters.paymentStatus === "outstanding"
        ? "فقط بدهکار"
        : "همه";

  return renderReport({
    title: "راپور فروش",
    rangeLabel,
    metrics,
    sections: [
      {
        title: "جزئیات فروش",
        cols,
        rows,
        totalRow: [
          "",
          "",
          "مجموع کل",
          "",
          "",
          int(totalQty),
          "",
          money(summary.grossSales),
          money(summary.totalPaid),
          money(summary.totalOutstanding),
          "",
          "",
        ],
      },
    ],
    metaLines: [
      `بازه: ${rangeLabel}    فیلتر پرداخت: ${paymentLabel}${filters.search ? `    جستجو: ${filters.search}` : ""}`,
      `تعداد معاملات: ${int(summary.count)}    فروش ناخالص: ${money(summary.grossSales)}    فروش خالص: ${money(summary.totalSales)}`,
      "مبلغ کل = ارزش ناخالص فاکتور    •    فروش خالص = ارزش فاکتور − بهای پرزه‌های خارجی",
      "پرداخت شده = مجموع پرداخت‌ها    •    باقی‌مانده = مبلغ پرداخت‌نشده",
      "فروش‌های مرتجع در این راپور لحاظ نشده‌اند.",
    ],
  });
}

/* ----------------------------- returns ----------------------------- */
export interface ReturnsReportData {
  rows: SalesQueryRow[];
  from: string;
  to: string;
}

export async function generateReturnsReportPdf(
  data: ReturnsReportData,
): Promise<Uint8Array> {
  const { rows, from, to } = data;
  const rangeLabel = hijriRange(from, to);

  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + num(r.grossAmount), 0);
  const totalRefunded = rows.reduce(
    (s, r) => s + Math.abs(num(r.actualPaidAmount)),
    0,
  );

  const metrics: ReportMetric[] = [
    { label: "تعداد مرجوعی", value: int(rows.length), color: NAVY },
    { label: "مجموع بازپرداخت", value: money(totalRefunded), color: RED },
    { label: "مجموع مبلغ فروش", value: money(totalAmount), color: NAVY_2 },
    { label: "مجموع تعداد", value: int(totalQty), color: AMBER },
  ];

  const cols: ReportCol<SalesQueryRow>[] = [
    { label: "#", w: 4, align: "center", get: (r) => int(r.id) },
    { label: "تاریخ فروش", w: 10, align: "center", get: (r) => hdate(r.issueDate) },
    { label: "تاریخ مرجوعی", w: 10, align: "center", get: (r) => hdate(r.returnedAt) },
    { label: "مشتری", w: 15, align: "right", get: (r) => r.customerName || "نامشخص" },
    { label: "قطعه", w: 15, align: "right", get: (r) => r.partName || "—" },
    { label: "شماره قطعه", w: 9, align: "center", get: (r) => r.partNumber || "—" },
    { label: "شریک", w: 10, align: "right", color: GREEN, get: (r) => r.partnerName || "بدون شراکت" },
    { label: "تعداد", w: 6, align: "center", get: (r) => int(r.quantity) },
    { label: "مبلغ فروش", w: 10, align: "center", get: (r) => money(r.grossAmount) },
    {
      label: "بازپرداخت",
      w: 10,
      align: "center",
      color: RED,
      get: (r) => {
        const v = Math.abs(num(r.actualPaidAmount));
        return v > 0 ? money(v) : "—";
      },
    },
    { label: "یادداشت", w: 13, align: "right", get: (r) => r.returnNote || "" },
  ];

  return renderReport({
    title: "راپور مرجوعیات",
    rangeLabel,
    metrics,
    sections: [
      {
        title: "جزئیات مرجوعیات",
        cols,
        rows,
        totalRow: [
          "",
          "",
          "جمع کل",
          "",
          "",
          "",
          "",
          int(totalQty),
          money(totalAmount),
          money(totalRefunded),
          "",
        ],
      },
    ],
    metaLines: [
      `بازه: ${rangeLabel}`,
      `تعداد مرجوعی: ${int(rows.length)}    مجموع تعداد: ${int(totalQty)}    مجموع بازپرداخت: ${money(totalRefunded)}`,
      "مبلغ فروش = ارزش ناخالص فاکتور مرجوع‌شده    •    بازپرداخت = پرداخت‌های منفی ثبت‌شده",
    ],
  });
}
