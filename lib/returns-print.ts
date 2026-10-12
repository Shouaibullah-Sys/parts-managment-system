// lib/returns-print.ts
// A4 printable returns (مرجوعیات) report — Minimal Corporate design (lib/print-core).

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

export interface ReturnsPrintRow {
  id: number;
  customerName: string;
  partName: string;
  partNumber: string | null;
  section: string | null;
  quantity: number;
  issueDate: string;
  totalAmount: string;
  actualPaidAmount?: string | number | null;
  returnedAt: string | null;
  returnNote: string | null;
  issuedBy: string | null;
}

export function printReturnsReport(
  win: Window,
  opts: {
    rows: ReturnsPrintRow[];
    from: string;
    to: string;
  }
) {
  const { rows, from, to } = opts;
  const now = new Date();

  let totalAmount = 0;
  let totalRefunded = 0;
  let totalQty = 0;

  // Column widths (%) — 11 columns
  const colgroup = `<colgroup>
    <col style="width:4%"><col style="width:10%"><col style="width:10%"><col style="width:14%">
    <col style="width:14%"><col style="width:9%"><col style="width:5%"><col style="width:6%">
    <col style="width:9%"><col style="width:9%"><col style="width:10%">
  </colgroup>`;

  const bodyRows = rows
    .map((r) => {
      const amt = parseFloat(r.totalAmount) || 0;
      const refunded = Math.abs(Number(r.actualPaidAmount) || 0);
      totalAmount += amt;
      totalRefunded += refunded;
      totalQty += r.quantity || 0;
      const retDate = r.returnedAt ? hijri(new Date(r.returnedAt)) : "—";
      return `<tr>
        <td class="num">${r.id}</td>
        <td class="num">${hijri(r.issueDate)}</td>
        <td class="num">${retDate}</td>
        <td class="wrap txt-r">${esc(r.customerName)}</td>
        <td class="wrap txt-r">${esc(r.partName)}</td>
        <td class="mono">${esc(r.partNumber || "—")}</td>
        <td>${esc(r.section || "—")}</td>
        <td class="num">${r.quantity}</td>
        <td class="num">${money(amt)}</td>
        <td class="num amt-red">${refunded > 0 ? money(refunded) : "—"}</td>
        <td class="wrap note">${esc(r.returnNote || "")}</td>
      </tr>`;
    })
    .join("");

  const empty = rows.length === 0;

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>راپور مرجوعیات - Diplomasi Ltd</title>
<style>${PRINT_CORE_CSS}</style>
</head>
<body>

${headerHTML({ rptTitle: "راپور مرجوعیات", ctx: `بازه زمانی: ${hijri(from)} — ${hijri(to)}`, now })}

<div class="metrics" style="grid-template-columns:repeat(4,1fr)">
  <div class="metric is-navy"><div class="label">تعداد مرجوعی</div><div class="value">${money(rows.length)}</div></div>
  <div class="metric is-red"><div class="label">مجموع بازپرداخت</div><div class="value">${money(totalRefunded)}</div></div>
  <div class="metric is-blue"><div class="label">مجموع مبلغ فروش</div><div class="value">${money(totalAmount)}</div></div>
  <div class="metric is-amber"><div class="label">مجموع تعداد</div><div class="value">${money(totalQty)}</div></div>
</div>

<div class="sec-title">جزئیات مرجوعیات</div>
${
  empty
    ? `<p class="empty">در این مدت هیچ مرجوعی ثبت نشده است</p>`
    : `<table class="rpt">
  ${colgroup}
  <thead>
    <tr>
      <th>#</th><th>تاریخ فروش</th><th>تاریخ مرجوعی</th><th>مشتری</th><th>قطعه</th><th>نمبر پارچه</th>
      <th>بخش</th><th>تعداد</th><th>مبلغ فروش</th><th>بازپرداخت</th><th>یادداشت</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="7">جمع کل</td>
      <td class="num">${totalQty}</td>
      <td class="num">${money(totalAmount)}</td>
      <td class="num amt-red">${money(totalRefunded)}</td>
      <td></td>
    </tr>
  </tfoot>
</table>`
}

${signHTML("امضای مسئول", "امضای مشتری")}
${footerHTML(now)}

</body>
</html>`;

  printDoc(win, html);
}
