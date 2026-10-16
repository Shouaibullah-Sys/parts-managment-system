// lib/customer-detail-pdf.ts
// راپور انفرادی مشتری — سرورساید (jsPDF)، راست‌چین و افقی
// بخش‌ها: سرصفحه، شاخص‌ها، خلاصهٔ شرکای مشتری، جزئیات معاملات، مشخصات
import { jsPDF } from "jspdf";
import {
  getCachedAssets,
  toEnglishDate,
  toEnglishNumber,
} from "@/lib/pdf-generator";
import type {
  CustomerDetailData,
  CustomerDetailRow,
  CustomerPartnerRow,
} from "@/components/sales/customer-summary-types";

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

/* formatters */
const num = (v: number | string) => Number(v) || 0;
const money = (v: number | string) =>
  num(v).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const int = (v: number | string) => Math.round(num(v)).toLocaleString("en-US");
const pct = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;

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

export async function generateCustomerDetailPdf(
  data: CustomerDetailData,
): Promise<Uint8Array> {
  const { from, to, period, paymentStatus, search } = data.filters;
  const now = new Date();

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const contentW = W - M * 2;
  const ROW_H = 15;
  const bottomLimit = () => H - 44;
  const rangeLabel =
    from || to
      ? `${from || "…"} — ${to || "…"}`
      : period === "lifetime"
        ? "همه سوابق"
        : period;

  const customerName = data.customer?.customerName ?? "نامشخص";
  const reportTitle = `راپور مشتری — ${customerName}`;

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
    doc.text(reportTitle, M, 18, { align: "left" });
    bold(false);
    doc.setFontSize(9);
    doc.setTextColor(205, 215, 230);
    doc.text(rangeLabel, W - M, 18, { align: "right" });
    y = 48;
  };
  const ensure = (h: number) => {
    if (y + h > bottomLimit()) newPage();
  };

  const firstHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 54, "F");
    bold(true);
    doc.setFontSize(15);
    doc.setTextColor(...WHITE);
    doc.text("راپور انفرادی مشتری", W / 2, 24, { align: "center" });
    doc.setFontSize(11);
    doc.text("دیپلماسی لمتید", W - M, 22, { align: "right" });
    bold(false);
    doc.setFontSize(9);
    doc.setTextColor(205, 215, 230);
    doc.text(rangeLabel, M, 43, { align: "left" });
    doc.text(customerName, W - M, 43, { align: "right" });
    y = 54 + 20;
  };

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
      dataRow(c, ["داده‌ای در این بازه یافت نشد"]);
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

  /* ----------------------------- content ----------------------------- */
  firstHeader();

  const c = data.customer;
  const isFullyPaid = c ? c.isFullyPaid : data.totals.outstanding <= 0;

  /* نوار اطلاعات مشتری */
  doc.setFillColor(...ZEBRA);
  doc.rect(M, y, contentW, 34, "F");
  doc.setFillColor(...(isFullyPaid ? GREEN : AMBER));
  doc.rect(W - M - 3, y, 3, 34, "F");
  bold(true);
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(customerName, W - M - 12, y + 15, { align: "right" });
  bold(false);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `${isFullyPaid ? "پرداخت کامل" : "بدهکار"}    |    تعداد فاکتور: ${int(data.totals.salesCount)}    |    تعداد قطعه: ${int(data.totals.quantity)}`,
    W - M - 12,
    y + 29,
    { align: "right" },
  );
  if (c) {
    doc.text(
      `سود ناخالص: ${money(c.grossProfit)}    |    شرکا: ${c.partners.join("، ") || "بدون شراکت"}`,
      M + 12,
      y + 29,
      { align: "left" },
    );
  }
  y += 34 + 14;

  /* شاخص‌ها */
  const metrics = [
    { label: "مجموع فروش", value: money(data.totals.amount), color: NAVY },
    { label: "بهای تمام شده", value: money(c?.cogs ?? 0), color: NAVY_2 },
    { label: "سود ناخالص", value: money(c?.grossProfit ?? 0), color: GREEN },
    { label: "سهم شرکا", value: money(data.partners.reduce((s, p) => s + p.partnerShare, 0)), color: GREEN },
    { label: "تخفیف", value: money(data.totals.discount), color: RED },
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
    doc.setFontSize(11);
    bold(true);
    doc.setTextColor(...m.color);
    doc.text(m.value, x + boxW - 8, y + 37, { align: "right" });
  });
  bold(false);
  y += boxH + 16;

  /* ۱) خلاصهٔ شرکای این مشتری */
  const partnerCols: Col<CustomerPartnerRow>[] = [
    { label: "#", w: 3, align: "center", get: (_r, i) => int(i + 1) },
    { label: "شریک", w: 16, align: "right", get: (r) => r.partnerName },
    { label: "درصد", w: 6, align: "center", get: (r) => pct(r.percentage) },
    { label: "تعداد فاکتور", w: 7, align: "center", get: (r) => int(r.salesCount) },
    { label: "تعداد", w: 5, align: "center", get: (r) => int(r.quantity) },
    { label: "فروش", w: 11, align: "center", get: (r) => money(r.revenue) },
    { label: "بهای تمام شده", w: 11, align: "center", get: (r) => money(r.cogs) },
    { label: "سود ناخالص", w: 11, align: "center", color: GREEN, get: (r) => money(r.grossProfit) },
    { label: "سهم شریک", w: 11, align: "center", color: GREEN, get: (r) => money(r.partnerShare) },
    { label: "سهم مغازه", w: 11, align: "center", get: (r) => money(r.shopShare) },
    { label: "باقی‌مانده", w: 11, align: "center", color: AMBER, get: (r) => money(r.outstanding) },
  ];
  const pT = data.partners.reduce(
    (a, r) => ({
      salesCount: a.salesCount + r.salesCount,
      quantity: a.quantity + r.quantity,
      revenue: a.revenue + r.revenue,
      cogs: a.cogs + r.cogs,
      gross: a.gross + r.grossProfit,
      partnerShare: a.partnerShare + r.partnerShare,
      shopShare: a.shopShare + r.shopShare,
      outstanding: a.outstanding + r.outstanding,
    }),
    { salesCount: 0, quantity: 0, revenue: 0, cogs: 0, gross: 0, partnerShare: 0, shopShare: 0, outstanding: 0 },
  );
  renderTable("۱) خلاصهٔ شرکای این مشتری", partnerCols, data.partners, [
    "",
    "مجموع کل",
    "",
    int(pT.salesCount),
    int(pT.quantity),
    money(pT.revenue),
    money(pT.cogs),
    money(pT.gross),
    money(pT.partnerShare),
    money(pT.shopShare),
    money(pT.outstanding),
  ]);

  /* ۲) جزئیات معاملات */
  const txCols: Col<CustomerDetailRow>[] = [
    { label: "#", w: 3, align: "center", get: (_r, i) => int(i + 1) },
    { label: "تاریخ", w: 9, align: "center", get: (r) => (r.issueDate ? toEnglishDate(new Date(r.issueDate)) : "—") },
    { label: "قطعه", w: 17, align: "right", get: (r) => r.partName || "—" },
    { label: "شماره قطعه", w: 9, align: "center", get: (r) => r.partNumber || "—" },
    { label: "شریک", w: 11, align: "right", get: (r) => r.partnerName || "بدون شراکت" },
    { label: "تعداد", w: 5, align: "center", get: (r) => int(r.quantity) },
    { label: "مبلغ کل", w: 10, align: "center", get: (r) => money(r.amount) },
    { label: "تخفیف", w: 8, align: "center", color: RED, get: (r) => (r.discount > 0 ? money(r.discount) : "—") },
    { label: "پرداخت شده", w: 10, align: "center", color: GREEN, get: (r) => money(r.paid) },
    { label: "باقی‌مانده", w: 10, align: "center", color: AMBER, get: (r) => money(r.outstanding) },
    { label: "وضعیت", w: 8, align: "center", get: (r) => (r.isFullyPaid ? "پرداخت کامل" : "بدهکار") },
    { label: "صادر کننده", w: 10, align: "right", get: (r) => r.issuedBy || "نامشخص" },
  ];
  renderTable("۲) جزئیات معاملات", txCols, data.rows, [
    "",
    "",
    "مجموع کل",
    "",
    "",
    int(data.totals.quantity),
    money(data.totals.amount),
    money(data.totals.discount),
    money(data.totals.paid),
    money(data.totals.outstanding),
    "",
    "",
  ]);

  /* ۳) مشخصات */
  sectionBar("۳) مشخصات گزارش");
  const paymentLabel =
    paymentStatus === "paid"
      ? "فقط پرداخت‌شده"
      : paymentStatus === "outstanding"
        ? "فقط بدهکار"
        : "همه";
  const metaLines = [
    `مشتری: ${customerName}    بازه: ${rangeLabel}    دوره: ${period}`,
    `فیلتر پرداخت: ${paymentLabel}${search ? `    جستجو: ${search}` : ""}`,
    `تعداد فاکتور: ${int(data.totals.salesCount)}    تعداد قطعه: ${int(data.totals.quantity)}    شرکا: ${int(data.partners.length)}`,
    "سود ناخالص = فروش ناخالص − بهای تمام‌شده    •    سهم شریک = سود ناخالص × درصد شریک",
    "سهم مغازه = سود ناخالص − سهم شریک    •    باقی‌مانده = مبلغ پرداخت‌نشده",
    "فروش‌های مرتجع در این راپور لحاظ نشده‌اند.",
  ];
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
    doc.text(reportTitle, W / 2, H - 18, { align: "center" });
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
