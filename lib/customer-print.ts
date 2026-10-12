// lib/customer-print.ts
// A4 printable per-customer report — Minimal Corporate design (lib/print-core).

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

export interface CustomerPrintRow {
  id: number;
  partName: string;
  partNumber: string | null;
  quantity: number;
  issueDate: string;
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
  discount: string;
  isFullyPaid: boolean;
  issuedBy: string | null;
}

export interface CustomerPrintSummary {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  count: number;
}

export function printCustomerReport(
  win: Window,
  opts: {
    customerName: string;
    rows: CustomerPrintRow[];
    summary: CustomerPrintSummary | null;
    total: number;
  }
) {
  const { customerName, rows, summary, total } = opts;
  const now = new Date();

  const sumSales = summary?.totalSales ?? 0;
  const sumPaid = summary?.totalPaid ?? 0;
  const sumOutstanding = summary?.totalOutstanding ?? 0;
  const count = summary?.count ?? rows.length;
  const sumDiscount = rows.reduce(
    (s, r) => s + (parseFloat(r.discount) || 0),
    0
  );
  const truncated = rows.length < total;

  // Column widths (%) — 11 columns
  const colgroup = `<colgroup>
    <col style="width:4%"><col style="width:11%"><col style="width:17%"><col style="width:10%">
    <col style="width:6%"><col style="width:9%"><col style="width:8%"><col style="width:9%">
    <col style="width:9%"><col style="width:9%"><col style="width:8%">
  </colgroup>`;

  const bodyRows =
    rows.length > 0
      ? rows
          .map(
            (r, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td class="num">${hijri(r.issueDate)}</td>
        <td class="wrap txt-r">${esc(r.partName)}</td>
        <td class="mono">${esc(r.partNumber || "—")}</td>
        <td class="num">${money(r.quantity)}</td>
        <td class="num">${money(r.totalAmount)}</td>
        <td class="num amt-red">${(parseFloat(r.discount) || 0) > 0 ? money(r.discount) : "—"}</td>
        <td class="num amt-green">${money(r.paidAmount)}</td>
        <td class="num amt-amber">${money(r.outstanding)}</td>
        <td><span class="badge ${r.isFullyPaid ? "badge-green" : "badge-amber"}">${r.isFullyPaid ? "پرداخت کامل" : "بدهکار"}</span></td>
        <td class="wrap">${esc(r.issuedBy || "نامشخص")}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="11" class="empty">هیچ سابقه فروشی برای این مشتری یافت نشد</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>راپور مشتری ${esc(customerName)} - Diplomasi Ltd</title>
<style>${PRINT_CORE_CSS}</style>
</head>
<body>

${headerHTML({ rptTitle: "راپور مشتری", ctx: `مشتری: ${esc(customerName)}`, now })}

<div class="metrics" style="grid-template-columns:repeat(5,1fr)">
  <div class="metric is-navy"><div class="label">تعداد معاملات</div><div class="value">${money(count)}</div></div>
  <div class="metric is-blue"><div class="label">مجموع فروش</div><div class="value">${money(sumSales)}</div></div>
  <div class="metric is-red"><div class="label">مجموع تخفیف</div><div class="value">${money(sumDiscount)}</div></div>
  <div class="metric is-green"><div class="label">پرداخت شده</div><div class="value">${money(sumPaid)}</div></div>
  <div class="metric is-amber"><div class="label">باقیمانده</div><div class="value">${money(sumOutstanding)}</div></div>
</div>

<div class="sec-title">جزئیات معاملات${truncated ? ` (نمایش ${money(rows.length)} از ${money(total)})` : ""}</div>
<table class="rpt">
  ${colgroup}
  <thead>
    <tr>
      <th>#</th><th>تاریخ</th><th>قطعه</th><th>شماره قطعه</th><th>تعداد</th><th>مبلغ کل</th>
      <th>تخفیف</th><th>پرداخت شده</th><th>باقیمانده</th><th>وضعیت</th><th>صادر کننده</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="5">مجموع کل</td>
      <td class="num">${money(sumSales)}</td>
      <td class="num amt-red">${money(sumDiscount)}</td>
      <td class="num amt-green">${money(sumPaid)}</td>
      <td class="num amt-amber">${money(sumOutstanding)}</td>
      <td colspan="2" class="num">${money(count)} معامله</td>
    </tr>
  </tfoot>
</table>
${truncated ? `<div class="note">* به دلیل حجم زیاد، فقط ${money(rows.length)} ردیف اول چاپ شده است؛ مبالغ بالا مربوط به کل سوابق این مشتری است.</div>` : ""}

${signHTML("امضای مسئول", "امضای مشتری")}
${footerHTML(now)}

</body>
</html>`;

  printDoc(win, html);
}
