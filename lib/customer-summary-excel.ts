// lib/customer-summary-excel.ts
// خروجی اکسل گزارش «خلاصه مشتریان و شرکا» — راست‌چین، چند شیت و سبک‌بندی‌شده
import type * as XLSXNamespace from "xlsx-js-style";
import type { WorkSheet } from "xlsx-js-style";
import type {
  CustomerSummaryData,
  CustomerSummaryRow,
  CustomerPartnerRow,
  CustomerSummaryPartnerRollup,
} from "@/components/sales/customer-summary-types";

type XLSXModule = typeof XLSXNamespace;

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

/* palette */
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
  alignment: { horizontal: "right", vertical: "center", readingOrder: 2 },
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
  alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
  border: { top: thin(NAVY), bottom: thin(NAVY), left: thin(NAVY), right: thin(NAVY) },
};
const totalStyle: Style = {
  ...baseStyle,
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: NAVY } },
  fill: { patternType: "solid", fgColor: { rgb: TOTAL_BG } },
};

const num = (v: number | string) => Number(v) || 0;
const round2 = (v: number) => Math.round(v * 100) / 100;

interface SheetSpec {
  title: string;
  meta?: string;
  headers: string[];
  rows: (string | number)[][];
  widths: number[];
  formats?: Record<number, string>;
  totals?: (string | number | null)[];
}

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
      if (R === 0) cell.s = titleStyle;
      else if (R === 1) cell.s = metaStyle;
      else if (R === headerRow) cell.s = headerStyle;
      else {
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

export async function exportCustomerSummaryExcel(
  data: CustomerSummaryData,
  opts: { period: string; from: string; to: string; paymentStatus: string; search: string },
) {
  const { period, from, to, paymentStatus, search } = opts;
  const XLSX = await loadXLSX();

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  const rangeLabel =
    from || to ? `${from || "…"} — ${to || "…"}` : period === "lifetime" ? "همه سوابق" : period;

  /* ۱) خلاصه مشتریان */
  const custSheet = buildSheet(XLSX, {
    title: "خلاصه مشتریان",
    meta: `بازه: ${rangeLabel} • تعداد مشتریان: ${data.totals.customersCount}`,
    headers: [
      "#", "مشتری", "تعداد فروش", "تعداد", "فروش", "بهای تمام شده",
      "سود ناخالص", "تخفیف", "پرداخت شده", "باقی‌مانده", "شرکا", "وضعیت",
    ],
    rows: data.customers.map((c: CustomerSummaryRow, i) => [
      i + 1,
      c.customerName,
      c.salesCount,
      c.quantity,
      round2(c.revenue),
      round2(c.cogs),
      round2(c.grossProfit),
      round2(c.discount),
      round2(c.paid),
      round2(c.outstanding),
      c.partners.join("، ") || "بدون شراکت",
      c.isFullyPaid ? "پرداخت کامل" : "بدهکار",
    ]),
    totals: [
      null, "مجموع کل", data.totals.salesCount, data.totals.quantity,
      round2(data.totals.revenue), round2(data.totals.cogs),
      round2(data.totals.grossProfit), round2(data.totals.discount),
      round2(data.totals.paid), round2(data.totals.outstanding), null, null,
    ],
    widths: [4, 26, 10, 8, 14, 15, 14, 11, 14, 14, 26, 12],
    formats: { 2: INT, 3: INT, 4: MONEY, 5: MONEY, 6: MONEY, 7: MONEY, 8: MONEY, 9: MONEY },
  });

  /* ۲) تفکیک مشتری × شریک */
  const cpSheet = buildSheet(XLSX, {
    title: "تفکیک مشتریان به تفکیک شریک",
    meta: `بازه: ${rangeLabel} • تعداد ردیف: ${data.customerPartners.length}`,
    headers: [
      "#", "مشتری", "شریک", "درصد", "تعداد", "فروش", "بهای تمام شده",
      "سود ناخالص", "سهم شریک", "سهم مغازه", "پرداخت شده", "باقی‌مانده",
    ],
    rows: data.customerPartners.map((r: CustomerPartnerRow, i) => [
      i + 1,
      r.customerName,
      r.partnerName,
      r.percentage,
      r.quantity,
      round2(r.revenue),
      round2(r.cogs),
      round2(r.grossProfit),
      round2(r.partnerShare),
      round2(r.shopShare),
      round2(r.paid),
      round2(r.outstanding),
    ]),
    totals: (() => {
      const t = data.customerPartners.reduce(
        (a, r) => ({
          quantity: a.quantity + r.quantity,
          revenue: a.revenue + r.revenue,
          cogs: a.cogs + r.cogs,
          gross: a.gross + r.grossProfit,
          partnerShare: a.partnerShare + r.partnerShare,
          shopShare: a.shopShare + r.shopShare,
          paid: a.paid + r.paid,
          outstanding: a.outstanding + r.outstanding,
        }),
        { quantity: 0, revenue: 0, cogs: 0, gross: 0, partnerShare: 0, shopShare: 0, paid: 0, outstanding: 0 },
      );
      return [
        null, null, "مجموع کل", null, t.quantity, round2(t.revenue), round2(t.cogs),
        round2(t.gross), round2(t.partnerShare), round2(t.shopShare),
        round2(t.paid), round2(t.outstanding),
      ];
    })(),
    widths: [4, 24, 20, 8, 8, 14, 15, 14, 14, 14, 14, 14],
    formats: { 3: PCT, 4: INT, 5: MONEY, 6: MONEY, 7: MONEY, 8: MONEY, 9: MONEY, 10: MONEY, 11: MONEY },
  });

  /* ۳) خلاصه شرکا */
  const partnerSheet = buildSheet(XLSX, {
    title: "خلاصه شرکا",
    meta: `بازه: ${rangeLabel} • تعداد شرکا: ${data.partners.length}`,
    headers: [
      "#", "شریک", "درصد", "تعداد مشتری", "تعداد فاکتور", "فروش",
      "بهای تمام شده", "سود ناخالص", "سهم شریک", "سهم مغازه", "باقی‌مانده",
    ],
    rows: data.partners.map((r: CustomerSummaryPartnerRollup, i) => [
      i + 1,
      r.partnerName,
      r.percentage,
      r.customersCount,
      r.salesCount,
      round2(r.revenue),
      round2(r.cogs),
      round2(r.grossProfit),
      round2(r.partnerShare),
      round2(r.shopShare),
      round2(r.outstanding),
    ]),
    totals: (() => {
      const t = data.partners.reduce(
        (a, r) => ({
          customers: a.customers + r.customersCount,
          salesCount: a.salesCount + r.salesCount,
          revenue: a.revenue + r.revenue,
          cogs: a.cogs + r.cogs,
          gross: a.gross + r.grossProfit,
          partnerShare: a.partnerShare + r.partnerShare,
          shopShare: a.shopShare + r.shopShare,
          outstanding: a.outstanding + r.outstanding,
        }),
        { customers: 0, salesCount: 0, revenue: 0, cogs: 0, gross: 0, partnerShare: 0, shopShare: 0, outstanding: 0 },
      );
      return [
        null, "مجموع کل", null, t.customers, t.salesCount, round2(t.revenue),
        round2(t.cogs), round2(t.gross), round2(t.partnerShare),
        round2(t.shopShare), round2(t.outstanding),
      ];
    })(),
    widths: [4, 22, 9, 12, 12, 14, 15, 14, 14, 14, 14],
    formats: { 2: PCT, 3: INT, 4: INT, 5: MONEY, 6: MONEY, 7: MONEY, 8: MONEY, 9: MONEY, 10: MONEY },
  });

  /* ۴) مشخصات */
  const paymentLabel =
    paymentStatus === "paid"
      ? "فقط پرداخت‌شده"
      : paymentStatus === "outstanding"
        ? "فقط بدهکار"
        : "همه";
  const metaSheet = buildSheet(XLSX, {
    title: "مشخصات گزارش",
    meta: "این برگه برای مستندسازی فیلترها و مفروضات محاسبه است",
    headers: ["عنوان", "مقدار"],
    rows: [
      ["عنوان گزارش", "راپور خلاصه مشتریان و شرکا"],
      ["بازه", rangeLabel],
      ["دوره", period],
      ["فیلتر پرداخت", paymentLabel],
      ["جستجو", search || "—"],
      ["تعداد مشتریان", data.totals.customersCount],
      ["تعداد شرکا", data.totals.partnersCount],
      ["تعداد فاکتور", data.totals.salesCount],
      ["فروش ناخالص", round2(data.totals.revenue)],
      ["بهای تمام شده", round2(data.totals.cogs)],
      ["سود ناخالص", round2(data.totals.grossProfit)],
      ["سهم شرکا", round2(data.totals.partnerShare)],
      ["سهم مغازه", round2(data.totals.shopShare)],
      ["پرداخت شده", round2(data.totals.paid)],
      ["باقی‌مانده", round2(data.totals.outstanding)],
      ["تاریخ تولید فایل", new Date().toLocaleString("fa-IR")],
      ["فرمول سهم شریک", "سود ناخالص × درصد شریک"],
      ["فرمول سود ناخالص", "فروش ناخالص − بهای تمام‌شده"],
    ],
    widths: [26, 44],
    formats: { 1: MONEY },
  });

  XLSX.utils.book_append_sheet(wb, custSheet, "خلاصه مشتریان");
  XLSX.utils.book_append_sheet(wb, cpSheet, "مشتری×شریک");
  XLSX.utils.book_append_sheet(wb, partnerSheet, "خلاصه شرکا");
  XLSX.utils.book_append_sheet(wb, metaSheet, "مشخصات");

  const filename = `customer-summary-${from || "all"}_${to || "all"}.xlsx`;
  XLSX.writeFile(wb, filename);
}
