// components/partners/partner-report-types.ts
// انواع مشترک گزارش فروش و سود شرکا (کلاینت)

export interface PartnerSummaryRow {
  id: number | null; // null = بدون شراکت
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
  returnedCount: number;
}

export interface PartnerReportTotals {
  salesCount: number;
  units: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  partnerShare: number;
  shopShare: number;
  paid: number;
  outstanding: number;
  returnedCount: number;
}

export interface PartnerTrendPoint {
  bucket: string; // "YYYY-MM-DD" یا "YYYY-MM"
  partnerId: number | null;
  partnerName: string | null;
  revenue: string;
  cogs: string;
  salesCount: number;
}

export interface PartnerPartRow {
  partnerId: number | null;
  partId: number | null;
  partName: string;
  partNumber: string;
  quantity: number;
  revenue: string;
  cogs: string;
}

export interface PartnerCustomerRow {
  partnerId: number | null;
  customerId: number | null;
  customerName: string | null;
  salesCount: number;
  revenue: string;
  outstanding: string;
}

export interface PartnerReportData {
  summary: PartnerSummaryRow[];
  totals: PartnerReportTotals;
  trend: PartnerTrendPoint[];
  partsByPartner: Record<string, PartnerPartRow[]>;
  customersByPartner: Record<string, PartnerCustomerRow[]>;
  granularity: "day" | "month";
}
