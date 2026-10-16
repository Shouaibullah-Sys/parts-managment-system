// lib/partner-excel.ts
// خروجی اکسل گزارش فروش و سود شرکا — راست‌چین، چند شیت و با سبک‌بندی کامل
import type * as XLSXNamespace from "xlsx-js-style";
import type { WorkSheet } from "xlsx-js-style";
import type {
  PartnerSummaryRow,
  PartnerReportTotals,
  PartnerPartRow,
  PartnerCustomerRow,
  PartnerTrendPoint,
} from "@/components/partners/partner-report-types";

type XLSXModule = typeof XLSXNamespace;

// کتابخانهٔ xlsx-js-style فقط به شکل CommonJS منتشر شده و interop آن در
// Turbopack قابل اتکا نیست (چه با import * و چه با import() پویا، هر دو بار
// بدون utils برمی‌گردند). بنابراین همان باندل مرورگری UMD را از /public با تگ
// script بار می‌کنیم؛ این باندل خودش window.XLSX را مقدار می‌دهد و کاملاً
// مستقل از رفتار باندلر است.
const XLSX_SCRIPT_SRC = "/vendor/xlsx-js-style.bundle.js";
let xlsxLoad: Promise<XLSXModule> | null = null;

function readWindowXLSX(): XLSXModule | null {
  if (typeof window === "undefined") return null;
  const lib = (window as unknown as { XLSX?: XLSXModule }).XLSX;
  return lib && lib.utils && typeof lib.utils.book_new === "function" ? lib : null;
}

function loadXLSX(): Promise<XLSXModule> {
  const ready = readWindowXLSX();
  if (ready) return Promise.resolve(ready);
  if (xlsxLoad) return xlsxLoad;

  xlsxLoad = new Promise<XLSXModule>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("کتابخانهٔ اکسل فقط در محیط مرورگر قابل بارگذاری است"));
      return;
    }
    const settle = () => {
      const lib = readWindowXLSX();
      if (lib) resolve(lib);
      else reject(new Error("کتابخانهٔ اکسل بارگذاری شد اما window.XLSX ساخته نشد"));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-xlsx-style="1"]');
    if (existing) {
      existing.addEventListener("load", settle);
      existing.addEventListener("error", () => {
        xlsxLoad = null;
        reject(new Error("خطا در بارگذاری کتابخانهٔ اکسل"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = XLSX_SCRIPT_SRC;
    script.async = true;
    script.dataset.xlsxStyle = "1";
    script.addEventListener("load", settle);
    script.addEventListener("error", () => {
      xlsxLoad = null;
      reject(new Error("خطا در بارگذاری کتابخانهٔ اکسل"));
    });
    document.head.appendChild(script);
  });
  return xlsxLoad;
}

/* ----------------------------- palette ----------------------------- */
const NAVY = "FF16324F";
const NAVY_2 = "FF24507C";
const WHITE = "FFFFFFFF";
const MUTED = "FF44546A";
const TOTAL_BG = "FFD6E2F0";
const BORDER = "FFB7C4D6";

const MONEY = "#,##0.00";
const INT = "#,##0";
const PCT = '0.0"٪"';

type Style = Record<string, unknown>;

const thin = (rgb: string = BORDER) => ({ style: "thin", color: { rgb } });

const baseStyle: Style = {
  font: { name: "Calibri", sz: 11 },
  alignment: {
    horizontal: "right",
    vertical: "center",
    readingOrder: 2,
    wrapText: false,
  },
  border: { top: thin(), bottom: thin(), left: thin(), right: thin() },
};

const titleStyle: Style = {
  font: { name: "Calibri", sz: 15, bold: true, color: { rgb: WHITE } },
  fill: { patternType: "solid", fgColor: { rgb: NAVY } },
  alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
};

const metaStyle: Style = {
  font: { name: "Calibri", sz: 10, italic: true, color: { rgb: MUTED } },
  alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
};

const headerStyle: Style = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: WHITE } },
  fill: { patternType: "solid", fgColor: { rgb: NAVY_2 } },
  alignment: {
    horizontal: "center",
    vertical: "center",
    wrapText: true,
    readingOrder: 2,
  },
  border: { top: thin(NAVY), bottom: thin(NAVY), left: thin(NAVY), right: thin(NAVY) },
};

const totalStyle: Style = {
  ...baseStyle,
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: NAVY } },
  fill: { patternType: "solid", fgColor: { rgb: TOTAL_BG } },
};

/* ----------------------------- helpers ----------------------------- */
const num = (v: number | string) => Number(v) || 0;
const round1 = (v: number) => Math.round(v * 10) / 10;
const pctOf = (numerator: number, denominator: number) =>
  denominator > 0 ? round1((numerator / denominator) * 100) : 0;

interface SheetSpec {
  title: string;
  meta?: string;
  headers: string[];
  rows: (string | number)[][];
  widths: number[];
  formats?: Record<number, string>;
  totals?: (string | number | null)[];
}

/** ساخت یک شیت با سرصفحه، سبک‌بندی، فیلتر و ردیف جمع. */
function buildSheet(XLSX: XLSXModule, spec: SheetSpec): WorkSheet {
  const nCols = spec.headers.length;
  const pad = (value: string | number | null): (string | number | null)[] => [
    value,
    ...Array(nCols - 1).fill(null),
  ];

  const aoa: (string | number | null)[][] = [];
  aoa.push(pad(spec.title));
  aoa.push(pad(spec.meta ?? ""));
  aoa.push(spec.headers);
  for (const r of spec.rows) aoa.push(r);
  if (spec.totals) aoa.push(spec.totals);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const headerRow = 2;
  const firstDataRow = 3;
  const lastDataRow = firstDataRow + spec.rows.length - 1;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
  ];
  ws["!cols"] = spec.widths.map((wch) => ({ wch }));
  ws["!rows"] = [{ hpt: 28 }, { hpt: 17 }, { hpt: 30 }];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRow, c: 0 },
      e: { r: Math.max(headerRow, lastDataRow), c: nCols - 1 },
    }),
  };

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  const totalRow = spec.totals ? range.e.r : -1;

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = (ws[addr] ?? (ws[addr] = { t: "s", v: "" })) as {
        v?: unknown;
        t?: string;
        s?: Style;
        z?: string;
      };

      if (R === 0) {
        cell.s = titleStyle;
      } else if (R === 1) {
        cell.s = metaStyle;
      } else if (R === headerRow) {
        cell.s = headerStyle;
      } else {
        const fmt = spec.formats?.[C];
        const isTotal = R === totalRow;
        const style: Style = { ...(isTotal ? totalStyle : baseStyle) };
        if (fmt) style.numFmt = fmt;
        cell.s = style;
        if (fmt && typeof cell.v === "number") cell.z = fmt;
      }
    }
  }

  return ws;
}

/* ----------------------------- export ------------------------------ */
export async function exportPartnerReportExcel(opts: {
  rows: PartnerSummaryRow[];
  totals: PartnerReportTotals;
  parts: PartnerPartRow[];
  customers: PartnerCustomerRow[];
  trend: PartnerTrendPoint[];
  granularity: "day" | "month";
  from: string;
  to: string;
  partnerName?: string;
  includeReturned?: boolean;
}) {
  const {
    rows,
    totals,
    parts,
    customers,
    trend,
    granularity,
    from,
    to,
    partnerName,
    includeReturned,
  } = opts;

  const XLSX = await loadXLSX();

  const wb = XLSX.utils.book_new();
  // جهت ورقه‌ها راست‌به‌چپ
  wb.Workbook = { Views: [{ RTL: true }] };

  // نقشه‌های کمکی: نام و درصد هر شریک
  const nameById = new Map<string, string>();
  const pctById = new Map<string, number>();
  for (const s of rows) {
    const key = String(s.id ?? "unassigned");
    nameById.set(key, s.name);
    pctById.set(key, s.percentage);
  }
  const partnerKey = (id: number | null) => String(id ?? "unassigned");
  const partnerLabel = (id: number | null, name?: string | null) =>
    name ?? nameById.get(partnerKey(id)) ?? "بدون شراکت";

  const rangeLabel = `${from} — ${to}`;

  /* ۱) خلاصه به تفکیک شریک */
  const summarySheet = buildSheet(XLSX, {
    title: "راپور فروش و سود شرکا — خلاصه",
    meta: `بازه: ${rangeLabel} • شریک: ${partnerName || "همه شرکا"}`,
    headers: [
      "#",
      "شریک",
      "تعداد فاکتور",
      "تعداد",
      "فروش",
      "بهای تمام شده",
      "سود ناخالص",
      "حاشیه سود",
      "درصد شریک",
      "سهم شریک",
      "سهم مغازه",
      "پرداخت شده",
      "باقی‌مانده",
      "مرتجع",
    ],
    rows: rows.map((r, i) => [
      i + 1,
      r.name,
      r.salesCount,
      r.units,
      r.revenue,
      r.cogs,
      r.grossProfit,
      pctOf(r.grossProfit, r.revenue),
      r.percentage,
      +r.partnerShare.toFixed(2),
      +r.shopShare.toFixed(2),
      r.paid,
      r.outstanding,
      r.returnedCount,
    ]),
    totals: [
      null,
      "مجموع کل",
      totals.salesCount,
      totals.units,
      totals.revenue,
      totals.cogs,
      totals.grossProfit,
      pctOf(totals.grossProfit, totals.revenue),
      null,
      +totals.partnerShare.toFixed(2),
      +totals.shopShare.toFixed(2),
      totals.paid,
      totals.outstanding,
      totals.returnedCount,
    ],
    widths: [4, 22, 10, 8, 15, 16, 15, 11, 11, 15, 15, 15, 15, 9],
    formats: {
      2: INT,
      3: INT,
      4: MONEY,
      5: MONEY,
      6: MONEY,
      7: PCT,
      8: PCT,
      9: MONEY,
      10: MONEY,
      11: MONEY,
      12: MONEY,
      13: INT,
    },
  });

  /* ۲) قطعات — جزئیات کامل همهٔ اقلام فروخته‌شده */
  const partTotals = parts.reduce(
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

  const partsSheet = buildSheet(XLSX, {
    title: "جزئیات کامل قطعات",
    meta: `بازه: ${rangeLabel} • تعداد اقلام: ${parts.length} • شریک: ${partnerName || "همه شرکا"}`,
    headers: [
      "#",
      "شریک",
      "شماره قطعه",
      "نام قطعه",
      "تعداد",
      "فروش",
      "بهای تمام شده",
      "سود ناخالص",
      "حاشیه سود",
      "درصد شریک",
      "سهم شریک",
      "سهم مغازه",
    ],
    rows: parts.map((p, i) => {
      const rev = num(p.revenue);
      const cogs = num(p.cogs);
      const gross = rev - cogs;
      const pct = pctById.get(partnerKey(p.partnerId)) ?? 0;
      const share = (gross * pct) / 100;
      return [
        i + 1,
        partnerLabel(p.partnerId, p.partnerName),
        p.partNumber,
        p.partName,
        p.quantity,
        rev,
        cogs,
        gross,
        pctOf(gross, rev),
        pct,
        +share.toFixed(2),
        +(gross - share).toFixed(2),
      ];
    }),
    totals: [
      null,
      null,
      null,
      "مجموع کل",
      partTotals.quantity,
      partTotals.revenue,
      partTotals.cogs,
      partTotals.gross,
      pctOf(partTotals.gross, partTotals.revenue),
      null,
      +partTotals.partnerShare.toFixed(2),
      +(partTotals.gross - partTotals.partnerShare).toFixed(2),
    ],
    widths: [4, 20, 15, 30, 8, 15, 16, 15, 11, 11, 15, 15],
    formats: {
      4: INT,
      5: MONEY,
      6: MONEY,
      7: MONEY,
      8: PCT,
      9: PCT,
      10: MONEY,
      11: MONEY,
    },
  });

  /* ۳) مشتریان */
  const custTotals = customers.reduce(
    (acc, c) => {
      acc.salesCount += c.salesCount;
      acc.revenue += num(c.revenue);
      acc.outstanding += num(c.outstanding);
      return acc;
    },
    { salesCount: 0, revenue: 0, outstanding: 0 },
  );

  const customersSheet = buildSheet(XLSX, {
    title: "جزئیات مشتریان",
    meta: `بازه: ${rangeLabel} • تعداد ردیف: ${customers.length}`,
    headers: ["#", "شریک", "مشتری", "تعداد فاکتور", "مبلغ فروش", "باقی‌مانده"],
    rows: customers.map((c, i) => [
      i + 1,
      partnerLabel(c.partnerId, c.partnerName),
      c.customerName ?? "نامشخص",
      c.salesCount,
      num(c.revenue),
      num(c.outstanding),
    ]),
    totals: [
      null,
      null,
      "مجموع کل",
      custTotals.salesCount,
      custTotals.revenue,
      custTotals.outstanding,
    ],
    widths: [4, 20, 28, 12, 15, 15],
    formats: { 3: INT, 4: MONEY, 5: MONEY },
  });

  /* ۴) روند (زمانی) */
  const trendTotals = trend.reduce(
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

  const trendSheet = buildSheet(XLSX, {
    title: `روند فروش (${granularity === "day" ? "روزانه" : "ماهانه"})`,
    meta: `بازه: ${rangeLabel} • تعداد بازه‌ها: ${trend.length}`,
    headers: [
      "#",
      "بازه",
      "شریک",
      "تعداد فاکتور",
      "فروش",
      "بهای تمام شده",
      "سود ناخالص",
    ],
    rows: trend.map((t, i) => [
      i + 1,
      t.bucket,
      t.partnerName ?? "بدون شراکت",
      t.salesCount,
      num(t.revenue),
      num(t.cogs),
      num(t.revenue) - num(t.cogs),
    ]),
    totals: [
      null,
      null,
      "مجموع کل",
      trendTotals.salesCount,
      trendTotals.revenue,
      trendTotals.cogs,
      trendTotals.gross,
    ],
    widths: [4, 14, 22, 12, 15, 16, 15],
    formats: { 3: INT, 4: MONEY, 5: MONEY, 6: MONEY },
  });

  /* ۵) متادیتا */
  const metaSheet = buildSheet(XLSX, {
    title: "مشخصات گزارش",
    meta: "این برگه برای مستندسازی فیلترها و مفروضات محاسبه است",
    headers: ["عنوان", "مقدار"],
    rows: [
      ["عنوان گزارش", "راپور فروش و سود شرکا"],
      ["از تاریخ", from],
      ["تا تاریخ", to],
      ["شریک", partnerName || "همه شرکا"],
      ["شامل فروش‌های مرتجع", includeReturned ? "بله" : "خیر"],
      ["دانه‌بندی روند", granularity === "day" ? "روزانه" : "ماهانه"],
      ["تعداد شرکا", rows.length],
      ["تعداد اقلام قطعات", parts.length],
      ["تعداد ردیف‌های مشتریان", customers.length],
      ["تاریخ تولید فایل", new Date().toLocaleString("fa-IR")],
      ["فرمول سهم شریک", "سود ناخالص × درصد شریک"],
      ["سهم مغازه", "سود ناخالص − سهم شریک"],
    ],
    widths: [26, 44],
  });

  XLSX.utils.book_append_sheet(wb, summarySheet, "خلاصه شرکا");
  XLSX.utils.book_append_sheet(wb, partsSheet, "قطعات");
  XLSX.utils.book_append_sheet(wb, customersSheet, "مشتریان");
  XLSX.utils.book_append_sheet(wb, trendSheet, "روند");
  XLSX.utils.book_append_sheet(wb, metaSheet, "مشخصات");

  const filename = `partner-report-${from}_${to}.xlsx`;
  XLSX.writeFile(wb, filename);
}
