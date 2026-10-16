// lib/dashboard-print.ts
// A4 printable dashboard/management report — Minimal Corporate design (lib/print-core).
// Opens its own popup (data is already in hand, no async fetch).

import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import {
  PRINT_CORE_CSS,
  PRINT_NAVY,
  money,
  esc,
  headerHTML,
  footerHTML,
  openPopupAndPrint,
} from "./print-core";

interface DashboardPrintData {
  dateRange: { from: Date; to: Date };
  stats: {
    totalSales: number;
    totalPaid: number;
    totalOutstanding: number;
    totalCustomers: number;
    totalParts: number;
    lowStockCount: number;
    todaySales: number;
    monthlySales: number;
    paymentCompletionRate: number;
  } | null;
  salesTrend: { date: string; sales: number; payments: number }[];
  paymentStatus: { fullyPaid: number; partiallyPaid: number; notPaid: number } | null;
  expenseData: {
    totalExpenses: number;
    totalCategories: number;
    averageExpense: number;
    topCategory: string;
    categoryBreakdown: { category: string; amount: number; count: number; percentage: number }[];
    expenseTrend: { date: string; amount: number; count: number }[];
    weeklyComparison: { currentWeek: number; previousWeek: number; percentageChange: number };
    monthlyComparison: { currentMonth: number; previousMonth: number; percentageChange: number };
    profitAnalysis: { totalRevenue: number; totalExpenses: number; grossProfit: number; profitMargin: number; netProfit: number };
  } | null;
  lowStockItems: {
    id: number;
    part_number: string;
    name: string;
    min_stock: number;
    current_stock: number;
  }[];
}

function fmt(n: number): string {
  return n.toLocaleString("fa-IR");
}

function fmtDate(d: Date): string {
  return format(d, "yyyy/MM/dd", { locale: faIR });
}

// Simple bar chart drawn with divs (print-safe flat fills, no gradients).
function barChartHTML(data: { label: string; value: number }[], color: string, maxVal: number): string {
  if (data.length === 0) return '<p class="empty">داده‌ای موجود نیست</p>';
  const safeMax = maxVal || 1;
  return `
    <div style="display:flex;align-items:flex-end;gap:4px;height:110px;padding:6px 0;border-bottom:1px solid #E3E8EF">
      ${data.map((d) => {
        const h = Math.max((d.value / safeMax) * 80, 2);
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end">
            <div class="num" style="font-size:7px;color:#5B6670;margin-bottom:2px">${d.value > 0 ? fmt(d.value) : ""}</div>
            <div style="width:80%;height:${h}px;background:${color};border-radius:2px 2px 0 0;min-height:2px"></div>
            <div style="font-size:7px;color:#8A96A3;margin-top:3px;writing-mode:vertical-rl;transform:rotate(180deg);max-height:46px;overflow:hidden">${d.label}</div>
          </div>`;
      }).join("")}
    </div>`;
}

export function printDashboardReport(data: DashboardPrintData) {
  const { dateRange, stats, salesTrend, paymentStatus, expenseData, lowStockItems } = data;
  const totalFilteredSales = salesTrend?.reduce((s, i) => s + (i.sales || 0), 0) || 0;
  const totalFilteredPayments = salesTrend?.reduce((s, i) => s + (i.payments || 0), 0) || 0;
  const now = new Date();

  const salesBarData = (salesTrend || []).slice(-14).map((i) => ({
    label: format(new Date(i.date), "dd/MM"),
    value: i.sales,
  }));
  const salesBarMax = Math.max(...salesBarData.map((d) => d.value), 1);

  const expenseBarData = (expenseData?.expenseTrend || []).slice(-14).map((i) => ({
    label: format(new Date(i.date), "dd/MM"),
    value: i.amount,
  }));
  const expenseBarMax = Math.max(...expenseBarData.map((d) => d.value), 1);

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش داشبورد - Diplomasi Ltd</title>
<style>${PRINT_CORE_CSS}
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; break-inside: avoid; }
.profit-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; break-inside: avoid; }
.profit-box {
  text-align: center; padding: 8px;
  border: 1px solid #E3E8EF; border-top: 3px solid var(--accent, ${PRINT_NAVY});
  border-radius: 5px; background: #fff;
}
.profit-box .val { font-size: 13pt; font-weight: 700; color: var(--accent, ${PRINT_NAVY}); font-variant-numeric: tabular-nums; }
.profit-box .lbl { font-size: 7.5pt; color: #5B6670; margin-top: 2px; }
.profit-box.is-blue { --accent: #1D4ED8; }
.profit-box.is-red { --accent: #C0392B; }
.profit-box.is-green { --accent: #2A7A5A; }
.status-tile { text-align: center; padding: 6px; border-radius: 4px; border: 1px solid; }
.status-tile .v { font-size: 14pt; font-weight: 700; font-variant-numeric: tabular-nums; }
.status-tile .l { font-size: 7pt; margin-top: 2px; }
.status-green { background: #F0FDF4; border-color: #BBF7D0; color: #14653F; }
.status-amber { background: #FFFBEB; border-color: #FED7AA; color: #8A5A06; }
.status-red { background: #FEF2F2; border-color: #FECACA; color: #8F2B21; }
</style>
</head>
<body>

${headerHTML({ rptTitle: "گزارش داشبورد مدیریت", ctx: `بازه زمانی: ${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)}`, now })}

<!-- KEY METRICS -->
<div class="sec-title">شاخص‌های کلیدی</div>
<div class="metrics" style="grid-template-columns:repeat(5,1fr)">
  <div class="metric is-blue"><div class="label">مجموع فروش</div><div class="value">${fmt(stats?.totalSales || 0)}</div><div class="hint">افغانی</div></div>
  <div class="metric is-green"><div class="label">پرداختی جمع‌آوری شده</div><div class="value">${fmt(stats?.totalPaid || 0)}</div><div class="hint">${(stats?.paymentCompletionRate || 0).toFixed(1)}% نرخ تکمیل</div></div>
  <div class="metric is-amber"><div class="label">مانده حساب</div><div class="value">${fmt(stats?.totalOutstanding || 0)}</div><div class="hint">بین ${fmt(stats?.totalCustomers || 0)} مشتری</div></div>
  <div class="metric is-red"><div class="label">مجموع مصارف</div><div class="value">${fmt(expenseData?.totalExpenses || 0)}</div><div class="hint">${expenseData?.totalCategories || 0} دسته‌بندی</div></div>
  <div class="metric is-red"><div class="label">هشدار کمبود موجودی</div><div class="value">${fmt(lowStockItems.length)}</div><div class="hint">موارد زیر سطح حداقل</div></div>
</div>

<!-- SALES & PAYMENT STATUS -->
<div class="two-col">
  <div class="card">
    <div class="card-title">روند فروش (${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)})</div>
    ${barChartHTML(salesBarData, PRINT_NAVY, salesBarMax)}
  </div>
  <div class="card">
    <div class="card-title">وضعیت پرداخت</div>
    ${paymentStatus ? `
    <div style="text-align:center;padding:6px 0">
      <div class="num" style="font-size:20pt;font-weight:700;color:${PRINT_NAVY}">${fmt((paymentStatus.fullyPaid || 0) + (paymentStatus.partiallyPaid || 0) + (paymentStatus.notPaid || 0))}</div>
      <div style="font-size:8pt;color:#5B6670">مجموع معاملات</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center">
      <div class="status-tile status-green"><div class="v">${fmt(paymentStatus.fullyPaid)}</div><div class="l">پرداخت کامل</div></div>
      <div class="status-tile status-amber"><div class="v">${fmt(paymentStatus.partiallyPaid)}</div><div class="l">پرداخت جزئی</div></div>
      <div class="status-tile status-red"><div class="v">${fmt(paymentStatus.notPaid)}</div><div class="l">پرداخت نشده</div></div>
    </div>` : '<div class="empty">اطلاعات پرداختی موجود نیست</div>'}
  </div>
</div>

<!-- EXPENSES -->
<div class="two-col">
  <div class="card">
    <div class="card-title">روند مصارف</div>
    ${expenseBarData.length > 0 ? barChartHTML(expenseBarData, "#C0392B", expenseBarMax) : '<div class="empty">اطلاعات مصارف موجود نیست</div>'}
  </div>
  <div class="card">
    <div class="card-title">دسته‌بندی مصارف</div>
    ${(expenseData?.categoryBreakdown || []).length > 0 ? `
    <table class="rpt">
      <thead><tr><th>دسته‌بندی</th><th>مبلغ</th><th>تعداد</th><th>درصد</th></tr></thead>
      <tbody>
        ${(expenseData?.categoryBreakdown || []).map((c) => `
          <tr>
            <td class="wrap txt-r">${esc(c.category || "نامشخص")}</td>
            <td class="num">${fmt(c.amount)}</td>
            <td class="num">${fmt(c.count)}</td>
            <td class="num">${c.percentage.toFixed(1)}%</td>
          </tr>`).join("")}
      </tbody>
    </table>` : '<div class="empty">اطلاعات دسته‌بندی موجود نیست</div>'}
  </div>
</div>

<!-- PROFIT ANALYSIS -->
<div class="sec-title">تحلیل سود و زیان</div>
<div class="profit-grid">
  <div class="profit-box is-blue"><div class="val">${fmt(expenseData?.profitAnalysis?.totalRevenue || 0)}</div><div class="lbl">مجموع درآمد (AFN)</div></div>
  <div class="profit-box is-red"><div class="val">${fmt(expenseData?.profitAnalysis?.totalExpenses || 0)}</div><div class="lbl">مجموع مصارف (AFN)</div></div>
  <div class="profit-box ${(expenseData?.profitAnalysis?.grossProfit || 0) >= 0 ? "is-green" : "is-red"}"><div class="val">${fmt(expenseData?.profitAnalysis?.grossProfit || 0)}</div><div class="lbl">سود ناخالص (AFN)</div></div>
  <div class="profit-box ${(expenseData?.profitAnalysis?.profitMargin || 0) >= 0 ? "is-green" : "is-red"}"><div class="val">${(expenseData?.profitAnalysis?.profitMargin || 0).toFixed(1)}%</div><div class="lbl">حاشیه سود</div></div>
</div>

<!-- PERIOD COMPARISON -->
<div class="card" style="margin-top:10px">
  <div class="card-title">مقایسه دوره‌ای</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
    <div class="metric is-red" style="text-align:center"><div class="value">${fmt(expenseData?.weeklyComparison?.currentWeek || 0)}</div><div class="label">مصارف این هفته</div><div class="hint" style="color:${(expenseData?.weeklyComparison?.percentageChange || 0) >= 0 ? "#C0392B" : "#2A7A5A"}">${(expenseData?.weeklyComparison?.percentageChange || 0) >= 0 ? "↑" : "↓"} ${Math.abs(expenseData?.weeklyComparison?.percentageChange || 0).toFixed(1)}%</div></div>
    <div class="metric is-red" style="text-align:center"><div class="value">${fmt(expenseData?.monthlyComparison?.currentMonth || 0)}</div><div class="label">مصارف این ماه</div><div class="hint" style="color:${(expenseData?.monthlyComparison?.percentageChange || 0) >= 0 ? "#C0392B" : "#2A7A5A"}">${(expenseData?.monthlyComparison?.percentageChange || 0) >= 0 ? "↑" : "↓"} ${Math.abs(expenseData?.monthlyComparison?.percentageChange || 0).toFixed(1)}%</div></div>
    <div class="metric is-blue" style="text-align:center"><div class="value">${fmt(totalFilteredSales)}</div><div class="label">فروش فیلتر شده</div></div>
    <div class="metric is-green" style="text-align:center"><div class="value">${fmt(totalFilteredPayments)}</div><div class="label">پرداختی فیلتر شده</div></div>
  </div>
</div>

<!-- LOW STOCK TABLE -->
${lowStockItems.length > 0 ? `
<div class="sec-title">هشدار کمبود موجودی (${lowStockItems.length} مورد)</div>
<div class="card">
  <table class="rpt">
    <colgroup><col style="width:5%"><col style="width:16%"><col style="width:22%"><col style="width:11%"><col style="width:13%"><col style="width:11%"><col style="width:14%"></colgroup>
    <thead>
      <tr><th>#</th><th>شماره قطعه</th><th>نام</th><th>حداقل</th><th>موجودی فعلی</th><th>کمبود</th><th>وضعیت</th></tr>
    </thead>
    <tbody>
      ${lowStockItems.map((item, i) => {
        const deficit = item.min_stock - item.current_stock;
        const status = item.current_stock === 0 ? "تمام شده" : item.current_stock < item.min_stock / 2 ? "بحرانی" : "موجودی کم";
        const badge = item.current_stock === 0 ? "badge-red" : "badge-amber";
        return `<tr>
          <td class="num">${i + 1}</td>
          <td class="mono">${esc(item.part_number)}</td>
          <td class="wrap txt-r">${esc(item.name)}</td>
          <td class="num">${fmt(item.min_stock)}</td>
          <td class="num" style="font-weight:700;color:${item.current_stock === 0 ? "#C0392B" : "#B45309"}">${fmt(item.current_stock)}</td>
          <td class="num amt-red">-${fmt(deficit)}</td>
          <td><span class="badge ${badge}">${status}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- SALES TREND TABLE -->
${(salesTrend || []).length > 0 ? `
<div class="sec-title">جزئیات روند فروش</div>
<div class="card">
  <table class="rpt">
    <colgroup><col style="width:30%"><col style="width:23%"><col style="width:23%"><col style="width:24%"></colgroup>
    <thead><tr><th>تاریخ</th><th>فروش</th><th>پرداختی</th><th>مانده</th></tr></thead>
    <tbody>
      ${(salesTrend || []).map((s) => `<tr>
        <td class="num">${fmtDate(new Date(s.date))}</td>
        <td class="num">${fmt(s.sales)}</td>
        <td class="num amt-green">${fmt(s.payments)}</td>
        <td class="num amt-amber">${fmt(s.sales - s.payments)}</td>
      </tr>`).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td>مجموع</td>
        <td class="num">${fmt(totalFilteredSales)}</td>
        <td class="num amt-green">${fmt(totalFilteredPayments)}</td>
        <td class="num amt-amber">${fmt(totalFilteredSales - totalFilteredPayments)}</td>
      </tr>
    </tfoot>
  </table>
</div>` : ""}

${footerHTML(now)}

</body>
</html>`;

  openPopupAndPrint(html, 900, 700);
}
