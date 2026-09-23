import { format } from "date-fns";
import { faIR } from "date-fns/locale";

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
    section: string;
  }[];
}

function fmt(n: number): string {
  return n.toLocaleString("fa-IR");
}

function fmtDate(d: Date): string {
  return format(d, "yyyy/MM/dd", { locale: faIR });
}

function barChartHTML(data: { label: string; value: number }[], color: string, maxVal: number): string {
  if (data.length === 0) return '<p style="color:#999;text-align:center">داده‌ای موجود نیست</p>';
  const safeMax = maxVal || 1;
  return `
    <div style="display:flex;align-items:flex-end;gap:4px;height:120px;padding:8px 0;border-bottom:1px solid #e5e7eb">
      ${data.map(d => {
        const h = Math.max((d.value / safeMax) * 90, 2);
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end">
            <div style="font-size:7px;color:#666;margin-bottom:2px">${d.value > 0 ? fmt(d.value) : ''}</div>
            <div style="width:80%;height:${h}px;background:${color};border-radius:3px 3px 0 0;min-height:2px"></div>
            <div style="font-size:7px;color:#888;margin-top:3px;writing-mode:vertical-rl;transform:rotate(180deg);max-height:50px;overflow:hidden">${d.label}</div>
          </div>`;
      }).join('')}
    </div>`;
}

export function printDashboardReport(data: DashboardPrintData) {
  const { dateRange, stats, salesTrend, paymentStatus, expenseData, lowStockItems } = data;
  const totalFilteredSales = salesTrend?.reduce((s, i) => s + (i.sales || 0), 0) || 0;
  const totalFilteredPayments = salesTrend?.reduce((s, i) => s + (i.payments || 0), 0) || 0;
  const now = new Date();

  const salesBarData = (salesTrend || []).slice(-14).map(i => ({
    label: format(new Date(i.date), "dd/MM"),
    value: i.sales,
  }));
  const salesBarMax = Math.max(...salesBarData.map(d => d.value), 1);

  const expenseBarData = (expenseData?.expenseTrend || []).slice(-14).map(i => ({
    label: format(new Date(i.date), "dd/MM"),
    value: i.amount,
  }));
  const expenseBarMax = Math.max(...expenseBarData.map(d => d.value), 1);

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش داشبورد - Diplomasi Ltd</title>
<style>
  @page { size: A4; margin: 15mm 12mm 15mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    font-size: 10px;
    color: #1a1a1a;
    direction: rtl;
    background: white;
    line-height: 1.5;
  }
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-right { text-align: right; }
  .header-left { text-align: left; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .header .subtitle { font-size: 11px; opacity: 0.85; }
  .header .date-info { font-size: 9px; opacity: 0.7; margin-top: 4px; }
  .header .print-date { font-size: 9px; opacity: 0.7; text-align: left; }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1e293b;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 4px;
    margin: 12px 0 8px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .metric-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    background: #f8fafc;
  }
  .metric-card .label { font-size: 8px; color: #64748b; margin-bottom: 4px; }
  .metric-card .value { font-size: 14px; font-weight: 700; }
  .metric-card .sub { font-size: 8px; color: #94a3b8; margin-top: 2px; }
  .metric-card.blue .value { color: #2563eb; }
  .metric-card.green .value { color: #16a34a; }
  .metric-card.amber .value { color: #d97706; }
  .metric-card.red .value { color: #dc2626; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px;
    background: white;
  }
  .card-title { font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  table th {
    background: #1e293b;
    color: white;
    padding: 5px 6px;
    text-align: right;
    font-weight: 600;
    font-size: 8px;
  }
  table td {
    padding: 4px 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  table tr:nth-child(even) { background: #f8fafc; }
  table tr:hover { background: #f1f5f9; }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 7px;
    font-weight: 600;
  }
  .badge-red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .badge-amber { background: #fffbeb; color: #d97706; border: 1px solid #fed7aa; }
  .badge-green { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .profit-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .profit-box {
    text-align: center;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f8fafc;
  }
  .profit-box .val { font-size: 13px; font-weight: 700; }
  .profit-box .lbl { font-size: 8px; color: #64748b; margin-top: 2px; }
  .footer {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #94a3b8;
  }
  .empty-state { text-align: center; padding: 16px; color: #94a3b8; font-size: 10px; }
  .category-table td:nth-child(2),
  .category-table td:nth-child(3) { text-align: center; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { background: #1e293b !important; -webkit-print-color-adjust: exact; }
    table th { background: #1e293b !important; -webkit-print-color-adjust: exact; }
    .metric-card { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-right">
    <h1>Diplomasi Ltd</h1>
    <div class="subtitle">بل پرزه جات وسایط | کابل - افغانستان</div>
    <div class="date-info">
      بازه زمانی: ${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)}
    </div>
  </div>
  <div class="header-left">
    <div style="font-size:14px;font-weight:700">گزارش داشبورد مدیریت</div>
    <div class="print-date">تاریخ چاپ: ${fmtDate(now)} — ${now.toLocaleTimeString("fa-IR")}</div>
  </div>
</div>

<!-- KEY METRICS -->
<div class="section-title">📈 شاخص‌های کلیدی</div>
<div class="metrics-grid">
  <div class="metric-card blue">
    <div class="label">مجموع فروش</div>
    <div class="value">${fmt(stats?.totalSales || 0)}</div>
    <div class="sub">افغانی</div>
  </div>
  <div class="metric-card green">
    <div class="label">پرداختی جمع‌آوری شده</div>
    <div class="value">${fmt(stats?.totalPaid || 0)}</div>
    <div class="sub">${(stats?.paymentCompletionRate || 0).toFixed(1)}% نرخ تکمیل</div>
  </div>
  <div class="metric-card amber">
    <div class="label">مانده حساب</div>
    <div class="value">${fmt(stats?.totalOutstanding || 0)}</div>
    <div class="sub">بین ${fmt(stats?.totalCustomers || 0)} مشتری</div>
  </div>
  <div class="metric-card red">
    <div class="label">مجموع مصارف</div>
    <div class="value">${fmt(expenseData?.totalExpenses || 0)}</div>
    <div class="sub">${expenseData?.totalCategories || 0} دسته‌بندی</div>
  </div>
  <div class="metric-card red">
    <div class="label">هشدار کمبود موجودی</div>
    <div class="value">${fmt(lowStockItems.length)}</div>
    <div class="sub">موارد زیر سطح حداقل</div>
  </div>
</div>

<!-- SALES & PAYMENT STATUS -->
<div class="two-col">
  <div class="card">
    <div class="card-title">روند فروش (${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)})</div>
    ${barChartHTML(salesBarData, '#2563eb', salesBarMax)}
    <div style="display:flex;gap:12px;justify-content:center;margin-top:4px;font-size:8px;color:#666">
      <span>🔵 فروش</span>
    </div>
  </div>
  <div class="card">
    <div class="card-title">وضعیت پرداخت</div>
    ${paymentStatus ? `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:20px;font-weight:700">${fmt((paymentStatus.fullyPaid || 0) + (paymentStatus.partiallyPaid || 0) + (paymentStatus.notPaid || 0))}</div>
      <div style="font-size:8px;color:#888">مجموع معاملات</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center">
      <div style="padding:6px;border-radius:4px;background:#f0fdf4;border:1px solid #bbf7d0">
        <div style="font-size:14px;font-weight:700;color:#16a34a">${fmt(paymentStatus.fullyPaid)}</div>
        <div style="font-size:7px;color:#16a34a">پرداخت کامل</div>
      </div>
      <div style="padding:6px;border-radius:4px;background:#fffbeb;border:1px solid #fed7aa">
        <div style="font-size:14px;font-weight:700;color:#d97706">${fmt(paymentStatus.partiallyPaid)}</div>
        <div style="font-size:7px;color:#d97706">پرداخت جزئی</div>
      </div>
      <div style="padding:6px;border-radius:4px;background:#fef2f2;border:1px solid #fecaca">
        <div style="font-size:14px;font-weight:700;color:#dc2626">${fmt(paymentStatus.notPaid)}</div>
        <div style="font-size:7px;color:#dc2626">پرداخت نشده</div>
      </div>
    </div>` : '<div class="empty-state">اطلاعات پرداختی موجود نیست</div>'}
  </div>
</div>

<!-- EXPENSES -->
<div class="two-col">
  <div class="card">
    <div class="card-title">روند مصارف</div>
    ${expenseBarData.length > 0 ? barChartHTML(expenseBarData, '#dc2626', expenseBarMax) : '<div class="empty-state">اطلاعات مصارف موجود نیست</div>'}
  </div>
  <div class="card">
    <div class="card-title">دسته‌بندی مصارف</div>
    ${(expenseData?.categoryBreakdown || []).length > 0 ? `
    <table class="category-table">
      <thead><tr><th>دسته‌بندی</th><th>مبلغ</th><th>تعداد</th><th>درصد</th></tr></thead>
      <tbody>
        ${(expenseData?.categoryBreakdown || []).map(c => `
          <tr>
            <td>${c.category || 'نامشخص'}</td>
            <td>${fmt(c.amount)} AFN</td>
            <td>${fmt(c.count)}</td>
            <td>${c.percentage.toFixed(1)}%</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty-state">اطلاعات دسته‌بندی موجود نیست</div>'}
  </div>
</div>

<!-- PROFIT ANALYSIS -->
<div class="section-title">💰 تحلیل سود و زیان</div>
<div class="profit-grid">
  <div class="profit-box">
    <div class="val" style="color:#2563eb">${fmt(expenseData?.profitAnalysis?.totalRevenue || 0)}</div>
    <div class="lbl">مجموع درآمد (AFN)</div>
  </div>
  <div class="profit-box">
    <div class="val" style="color:#dc2626">${fmt(expenseData?.profitAnalysis?.totalExpenses || 0)}</div>
    <div class="lbl">مجموع مصارف (AFN)</div>
  </div>
  <div class="profit-box">
    <div class="val" style="color:${(expenseData?.profitAnalysis?.grossProfit || 0) >= 0 ? '#16a34a' : '#dc2626'}">${fmt(expenseData?.profitAnalysis?.grossProfit || 0)}</div>
    <div class="lbl">سود ناخالص (AFN)</div>
  </div>
  <div class="profit-box">
    <div class="val" style="color:${(expenseData?.profitAnalysis?.profitMargin || 0) >= 0 ? '#16a34a' : '#dc2626'}">${(expenseData?.profitAnalysis?.profitMargin || 0).toFixed(1)}%</div>
    <div class="lbl">حاشیه سود</div>
  </div>
</div>

<!-- PERIOD COMPARISON -->
<div class="card" style="margin-top:10px">
  <div class="card-title">مقایسه دوره‌ای</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
    <div style="text-align:center;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
      <div style="font-size:12px;font-weight:700">${fmt(expenseData?.weeklyComparison?.currentWeek || 0)}</div>
      <div style="font-size:7px;color:#888">مصارف این هفته</div>
      <div style="font-size:8px;font-weight:600;color:${(expenseData?.weeklyComparison?.percentageChange || 0) >= 0 ? '#dc2626' : '#16a34a'}">${(expenseData?.weeklyComparison?.percentageChange || 0) >= 0 ? '↑' : '↓'} ${Math.abs(expenseData?.weeklyComparison?.percentageChange || 0).toFixed(1)}%</div>
    </div>
    <div style="text-align:center;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
      <div style="font-size:12px;font-weight:700">${fmt(expenseData?.monthlyComparison?.currentMonth || 0)}</div>
      <div style="font-size:7px;color:#888">مصارف این ماه</div>
      <div style="font-size:8px;font-weight:600;color:${(expenseData?.monthlyComparison?.percentageChange || 0) >= 0 ? '#dc2626' : '#16a34a'}">${(expenseData?.monthlyComparison?.percentageChange || 0) >= 0 ? '↑' : '↓'} ${Math.abs(expenseData?.monthlyComparison?.percentageChange || 0).toFixed(1)}%</div>
    </div>
    <div style="text-align:center;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
      <div style="font-size:12px;font-weight:700">${fmt(totalFilteredSales)}</div>
      <div style="font-size:7px;color:#888">فروش فیلتر شده</div>
    </div>
    <div style="text-align:center;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
      <div style="font-size:12px;font-weight:700">${fmt(totalFilteredPayments)}</div>
      <div style="font-size:7px;color:#888">پرداختی فیلتر شده</div>
    </div>
  </div>
</div>

<!-- LOW STOCK TABLE -->
${lowStockItems.length > 0 ? `
<div class="section-title">⚠️ هشدار کمبود موجودی (${lowStockItems.length} مورد)</div>
<div class="card">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>شماره قطعه</th>
        <th>نام</th>
        <th>بخش</th>
        <th>حداقل</th>
        <th>موجودی فعلی</th>
        <th>کمبود</th>
        <th>وضعیت</th>
      </tr>
    </thead>
    <tbody>
      ${lowStockItems.map((item, i) => {
        const deficit = item.min_stock - item.current_stock;
        const status = item.current_stock === 0 ? 'تمام شده'
          : item.current_stock < item.min_stock / 2 ? 'بحرانی' : 'موجودی کم';
        const badge = item.current_stock === 0 ? 'badge-red'
          : item.current_stock < item.min_stock / 2 ? 'badge-amber' : 'badge-amber';
        return `<tr>
          <td>${i + 1}</td>
          <td style="font-family:monospace">${item.part_number}</td>
          <td>${item.name}</td>
          <td><span class="badge badge-green">${item.section}</span></td>
          <td style="text-align:center">${fmt(item.min_stock)}</td>
          <td style="text-align:center;font-weight:700;color:${item.current_stock === 0 ? '#dc2626' : item.current_stock < item.min_stock / 2 ? '#d97706' : '#d97706'}">${fmt(item.current_stock)}</td>
          <td style="text-align:center;color:#dc2626;font-weight:600">-${fmt(deficit)}</td>
          <td style="text-align:center"><span class="badge ${badge}">${status}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- SALES TREND TABLE -->
${(salesTrend || []).length > 0 ? `
<div class="section-title">📊 جزئیات روند فروش</div>
<div class="card">
  <table>
    <thead>
      <tr><th>تاریخ</th><th>فروش</th><th>پرداختی</th><th>مانده</th></tr>
    </thead>
    <tbody>
      ${(salesTrend || []).map(s => `<tr>
        <td>${fmtDate(new Date(s.date))}</td>
        <td style="text-align:center">${fmt(s.sales)}</td>
        <td style="text-align:center;color:#16a34a">${fmt(s.payments)}</td>
        <td style="text-align:center;color:#d97706">${fmt(s.sales - s.payments)}</td>
      </tr>`).join('')}
      <tr style="font-weight:700;background:#f1f5f9">
        <td>مجموع</td>
        <td style="text-align:center">${fmt(totalFilteredSales)}</td>
        <td style="text-align:center;color:#16a34a">${fmt(totalFilteredPayments)}</td>
        <td style="text-align:center;color:#d97706">${fmt(totalFilteredSales - totalFilteredPayments)}</td>
      </tr>
    </tbody>
  </table>
</div>` : ''}

<!-- FOOTER -->
<div class="footer">
  <span>Diplomasi Ltd — بل پرزه جات وسایط | کابل، افغانستان</span>
  <span>تاریخ چاپ: ${fmtDate(now)} — ${now.toLocaleTimeString("fa-IR")}</span>
  <span>این گزارش توسط سیستم تولید شده است</span>
</div>

</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("لطفاً پاپ‌آپ بلاکر را غیرفعال کنید");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 600);
}
