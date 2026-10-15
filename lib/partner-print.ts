// lib/partner-print.ts
// راپور چاپی «فروش و سود شرکا» — طراحی مشترک print-core (A4، راست‌چین)

import {
  PRINT_CORE_CSS,
  headerHTML,
  footerHTML,
  signHTML,
  printDoc,
  money,
  hijri,
  esc,
} from "./print-core";

export interface PartnerPrintRow {
  name: string;
  salesCount: number;
  units: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  percentage: number;
  partnerShare: number;
  shopShare: number;
  paid: number;
  outstanding: number;
}

export interface PartnerPrintTotals {
  salesCount: number;
  units: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  partnerShare: number;
  shopShare: number;
  paid: number;
  outstanding: number;
}

export function printPartnerReport(
  win: Window,
  opts: {
    rows: PartnerPrintRow[];
    totals: PartnerPrintTotals;
    from: string;
    to: string;
    partnerName?: string;
    section?: string;
  },
) {
  const { rows, totals, from, to, partnerName, section } = opts;
  const now = new Date();

  const chips = [
    `بازه: <b>${hijri(from)} — ${hijri(to)}</b>`,
    `شریک: <b>${esc(partnerName || "همه شرکا")}</b>`,
    `بخش: <b>${esc(section || "همه")}</b>`,
  ];
  const chipsHTML = `<div class="chips">${chips
    .map((c) => `<span class="chip">${c}</span>`)
    .join("")}</div>`;

  const bodyRows =
    rows.length > 0
      ? rows
          .map(
            (r, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td class="wrap txt-r">${esc(r.name)}</td>
        <td class="num">${money(r.salesCount)}</td>
        <td class="num">${money(r.units)}</td>
        <td class="num">${money(r.revenue)}</td>
        <td class="num">${money(r.cogs)}</td>
        <td class="num amt-green">${money(r.grossProfit)}</td>
        <td class="num">${r.percentage.toFixed(0)}٪</td>
        <td class="num amt-green">${money(r.partnerShare)}</td>
        <td class="num">${money(r.shopShare)}</td>
        <td class="num amt-green">${money(r.paid)}</td>
        <td class="num amt-amber">${money(r.outstanding)}</td>
      </tr>`,
          )
          .join("")
      : `<tr><td colspan="12" class="empty">داده‌ای در این بازه زمانی یافت نشد</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>راپور سود شرکا - Diplomasi Ltd</title>
<style>${PRINT_CORE_CSS}</style>
</head>
<body>

${headerHTML({ rptTitle: "راپور فروش و سود شرکا", ctx: `بازه زمانی: ${hijri(from)} — ${hijri(to)}`, now })}
${chipsHTML}

<div class="metrics" style="grid-template-columns:repeat(4,1fr)">
  <div class="metric is-navy"><div class="label">مجموع فروش</div><div class="value">${money(totals.revenue)}</div></div>
  <div class="metric is-blue"><div class="label">بهای تمام شده</div><div class="value">${money(totals.cogs)}</div></div>
  <div class="metric is-green"><div class="label">سود ناخالص</div><div class="value">${money(totals.grossProfit)}</div></div>
  <div class="metric is-amber"><div class="label">سهم شرکا</div><div class="value">${money(totals.partnerShare)}</div></div>
</div>

<div class="sec-title">خلاصه به تفکیک شریک</div>
<table class="rpt">
  <colgroup>
    <col style="width:4%"><col style="width:16%"><col style="width:7%"><col style="width:6%">
    <col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:6%">
    <col style="width:10%"><col style="width:10%"><col style="width:9%"><col style="width:8%">
  </colgroup>
  <thead>
    <tr>
      <th>#</th><th>شریک</th><th>تعداد فاکتور</th><th>تعداد</th>
      <th>فروش</th><th>بهای تمام شده</th><th>سود ناخالص</th><th>درصد</th>
      <th>سهم شریک</th><th>سهم مغازه</th><th>پرداخت شده</th><th>باقیمانده</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="4">مجموع کل</td>
      <td class="num">${money(totals.revenue)}</td>
      <td class="num">${money(totals.cogs)}</td>
      <td class="num amt-green">${money(totals.grossProfit)}</td>
      <td></td>
      <td class="num amt-green">${money(totals.partnerShare)}</td>
      <td class="num">${money(totals.shopShare)}</td>
      <td class="num amt-green">${money(totals.paid)}</td>
      <td class="num amt-amber">${money(totals.outstanding)}</td>
    </tr>
  </tfoot>
</table>
<div class="note">* سهم شریک = سود ناخالص × درصد شریک (از سهم فروش قطعاتِ منتسب به او). فروش‌های مرتجع در این راپور لحاظ نشده‌اند.</div>

${signHTML("امضای مسئول مالی", "امضای شریک")}
${footerHTML(now)}

</body>
</html>`;

  printDoc(win, html);
}
