// lib/sales-print.ts
// A4 printable sales report — Minimal Corporate design (lib/print-core).
// Opened in a popup window; data is fetched first, then printDoc writes + prints.

import {
  PRINT_CORE_CSS,
  money,
  hijri,
  esc,
  headerHTML,
  footerHTML,
  signHTML,
  printDoc,
} from "./print-core";

export interface SalesPrintRow {
  id: number;
  customerName: string;
  partName: string;
  partNumber: string | null;
  quantity: number;
  issueDate: string;
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
  isFullyPaid: boolean;
  issuedBy: string | null;
}

export interface SalesPrintSummary {
  totalSales: number;
  grossSales?: number;
  totalPaid: number;
  totalOutstanding: number;
  count: number;
  totalRefunds?: number;
  refundCount?: number;
  externalSale?: number;
  externalPayable?: number;
  netSales?: number;
}

// Active filters shown as chips in the report header (self-describing report).
export interface SalesPrintFilters {
  paymentStatus?: string; // "paid" | "outstanding" | "all"
  search?: string;
}

export function printSalesReport(
  win: Window,
  opts: {
    rows: SalesPrintRow[];
    summary: SalesPrintSummary | null;
    total: number;
    from: string;
    to: string;
    filters?: SalesPrintFilters;
  }
) {
  const { rows, summary, total, from, to, filters } = opts;
  const now = new Date();

  const sumSales = summary?.totalSales ?? 0;
  const sumPaid = summary?.totalPaid ?? 0;
  const sumOutstanding = summary?.totalOutstanding ?? 0;
  const count = summary?.count ?? rows.length;
  const truncated = rows.length < total;

  // Filter chips
  const paymentStatusLabel =
    filters?.paymentStatus === "paid"
      ? "پرداخت‌شده"
      : filters?.paymentStatus === "outstanding"
        ? "باقیمانده"
        : "همه";
  const chips = [
    `بازه: <b>${hijri(from)} — ${hijri(to)}</b>`,
    `وضعیت پرداخت: <b>${paymentStatusLabel}</b>`,
  ];
  if (filters?.search) chips.push(`جستجو: <b>${esc(filters.search)}</b>`);
  const chipsHTML = `<div class="chips">${chips
    .map((c) => `<span class="chip">${c}</span>`)
    .join("")}</div>`;

  // Column widths (% of A4 content width) — 11 columns
  const colgroup = `<colgroup>
    <col style="width:4%"><col style="width:14%"><col style="width:15%"><col style="width:9%">
    <col style="width:5%"><col style="width:10%"><col style="width:9%">
    <col style="width:9%"><col style="width:9%"><col style="width:8%"><col style="width:8%">
  </colgroup>`;

  const bodyRows =
    rows.length > 0
      ? rows
          .map(
            (r, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td class="wrap txt-r">${esc(r.customerName)}</td>
        <td class="wrap txt-r">${esc(r.partName)}</td>
        <td class="mono">${esc(r.partNumber || "—")}</td>
        <td class="num">${money(r.quantity)}</td>
        <td class="num">${hijri(r.issueDate)}</td>
        <td class="num">${money(r.totalAmount)}</td>
        <td class="num amt-green">${money(r.paidAmount)}</td>
        <td class="num amt-amber">${money(r.outstanding)}</td>
        <td><span class="badge ${r.isFullyPaid ? "badge-green" : "badge-amber"}">${r.isFullyPaid ? "پرداخت کامل" : "بدهکار"}</span></td>
        <td class="wrap">${esc(r.issuedBy || "نامشخص")}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="11" class="empty">داده‌ای در این بازه زمانی یافت نشد</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>راپور فروش - Diplomasi Ltd</title>
<style>${PRINT_CORE_CSS}</style>
</head>
<body>

${headerHTML({ rptTitle: "راپور فروش", ctx: `بازه زمانی: ${hijri(from)} — ${hijri(to)}`, now })}
${chipsHTML}

<div class="metrics" style="grid-template-columns:repeat(4,1fr)">
  <div class="metric is-navy"><div class="label">تعداد معاملات</div><div class="value">${money(count)}</div></div>
  <div class="metric is-blue"><div class="label">مجموع فروش</div><div class="value">${money(sumSales)}</div></div>
  <div class="metric is-green"><div class="label">پرداخت شده</div><div class="value">${money(sumPaid)}</div></div>
  <div class="metric is-amber"><div class="label">باقیمانده</div><div class="value">${money(sumOutstanding)}</div></div>
</div>
${
  (summary?.externalSale ?? 0) > 0
    ? `<div class="note">مجموع فروش ناخالص: <b>${money(summary?.grossSales ?? 0)}</b> — بهای خرید پرزه‌های خارجی (قابل پرداخت به فروشگاه‌ها): <b>${money(summary?.externalPayable ?? 0)}</b>. «مجموع فروش» و ردیف‌ها به صورت خالص (سود مغازه) نمایش داده شده‌اند.</div>`
    : ""
}

<div class="sec-title">جزئیات فروش${truncated ? ` (نمایش ${money(rows.length)} از ${money(total)})` : ""}</div>
<table class="rpt">
  ${colgroup}
  <thead>
    <tr>
      <th>#</th><th>مشتری</th><th>قطعه</th><th>شماره قطعه</th><th>تعداد</th>
      <th>تاریخ</th><th>مبلغ کل</th><th>پرداخت شده</th><th>باقیمانده</th><th>وضعیت</th><th>صادر کننده</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="6">مجموع کل</td>
      <td class="num">${money(sumSales)}</td>
      <td class="num amt-green">${money(sumPaid)}</td>
      <td class="num amt-amber">${money(sumOutstanding)}</td>
      <td colspan="2" class="num">${money(count)} معامله</td>
    </tr>
  </tfoot>
</table>
${truncated ? `<div class="note">* به دلیل حجم زیاد، فقط ${money(rows.length)} ردیف اول چاپ شده است؛ مبالغ بالا مربوط به کل بازه انتخابی است.</div>` : ""}

${signHTML("امضای مسئول فروش", "امضای مشتری")}
${footerHTML(now)}

</body>
</html>`;

  printDoc(win, html);
}
