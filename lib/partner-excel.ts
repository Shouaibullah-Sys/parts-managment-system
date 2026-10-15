// lib/partner-excel.ts
// خروجی اکسل گزارش فروش و سود شرکا
import * as XLSX from "xlsx";
import type {
  PartnerSummaryRow,
  PartnerReportTotals,
} from "@/components/partners/partner-report-types";

export function exportPartnerReportExcel(opts: {
  rows: PartnerSummaryRow[];
  totals: PartnerReportTotals;
  from: string;
  to: string;
  partnerName?: string;
  section?: string;
}) {
  const { rows, totals, from, to, partnerName, section } = opts;

  const wb = XLSX.utils.book_new();

  // شیت اصلی — خلاصه به تفکیک شریک
  const summaryData = rows.map((r, i) => ({
    "#": i + 1,
    شریک: r.name,
    "تعداد فاکتور": r.salesCount,
    تعداد: r.units,
    "فروش (افغانی)": r.revenue,
    "بهای تمام شده (افغانی)": r.cogs,
    "سود ناخالص (افغانی)": r.grossProfit,
    "حاشیه سود (%)": r.revenue > 0 ? +((r.grossProfit / r.revenue) * 100).toFixed(1) : 0,
    "درصد شریک": r.percentage,
    "سهم شریک (افغانی)": +r.partnerShare.toFixed(2),
    "سهم مغازه (افغانی)": +r.shopShare.toFixed(2),
    "پرداخت شده (افغانی)": r.paid,
    "باقیمانده (افغانی)": r.outstanding,
    "فروش‌های مرتجع": r.returnedCount,
  }));

  summaryData.push({
    "#": null as unknown as number,
    شریک: "مجموع کل",
    "تعداد فاکتور": totals.salesCount,
    تعداد: totals.units,
    "فروش (افغانی)": totals.revenue,
    "بهای تمام شده (افغانی)": totals.cogs,
    "سود ناخالص (افغانی)": totals.grossProfit,
    "حاشیه سود (%)":
      totals.revenue > 0
        ? +((totals.grossProfit / totals.revenue) * 100).toFixed(1)
        : 0,
    "درصد شریک": "" as unknown as number,
    "سهم شریک (افغانی)": +totals.partnerShare.toFixed(2),
    "سهم مغازه (افغانی)": +totals.shopShare.toFixed(2),
    "پرداخت شده (افغانی)": totals.paid,
    "باقیمانده (افغانی)": totals.outstanding,
    "فروش‌های مرتجع": totals.returnedCount,
  });

  const ws = XLSX.utils.json_to_sheet(summaryData);
  ws["!cols"] = [
    { wch: 4 }, // #
    { wch: 22 }, // شریک
    { wch: 11 },
    { wch: 8 },
    { wch: 15 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 13 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "خلاصه شرکا");

  // شیت فیلترها/متادیتا
  const meta = [
    { "عنوان گزارش": "راپور فروش و سود شرکا" },
    { "از تاریخ": from },
    { "تا تاریخ": to },
    { شریک: partnerName || "همه شرکا" },
    { بخش: section || "همه" },
    { "شامل مرتجعات": "خیر (مگر انتخاب شود)" },
    { "نکته": "سهم شریک = سود ناخالص × درصد شریک" },
  ];
  const wsMeta = XLSX.utils.json_to_sheet(meta);
  wsMeta["!cols"] = [{ wch: 24 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, "متادیتا");

  const filename = `partner-report-${from}_${to}.xlsx`;
  XLSX.writeFile(wb, filename);
}
