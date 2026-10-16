// components/sales/customer-summary-types.ts
// انواع مشترک گزارش «خلاصه مشتریان» (شامل تفکیک شرکا) — مشترک کلاینت و سرور

export interface CustomerSummaryRow {
  customerId: number | null;
  customerName: string;
  normalizedName: string | null;
  salesCount: number;
  quantity: number;
  /** مجموع ارزش فاکتورها (ناخالص) */
  revenue: number;
  /** قابل وصول خالص = ناخالص − بهای پرزه‌های خارجی */
  netSales: number;
  /** بهای تمام‌شدهٔ قطعات (اسنپ‌شات unitCost) */
  cogs: number;
  /** سود ناخالص = فروش ناخالص − بهای تمام‌شده */
  grossProfit: number;
  discount: number;
  paid: number;
  outstanding: number;
  /** نام شرکای درگیر با این مشتری */
  partners: string[];
  isFullyPaid: boolean;
}

export interface CustomerPartnerRow {
  customerId: number | null;
  customerName: string;
  normalizedName: string | null;
  partnerId: number | null;
  partnerName: string;
  percentage: number;
  salesCount: number;
  quantity: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  partnerShare: number;
  shopShare: number;
  paid: number;
  outstanding: number;
}

export interface CustomerSummaryPartnerRollup {
  partnerId: number | null;
  partnerName: string;
  percentage: number;
  customersCount: number;
  salesCount: number;
  quantity: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  partnerShare: number;
  shopShare: number;
  paid: number;
  outstanding: number;
}

export interface CustomerSummaryTotals {
  customersCount: number;
  partnersCount: number;
  salesCount: number;
  quantity: number;
  revenue: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  discount: number;
  paid: number;
  outstanding: number;
  partnerShare: number;
  shopShare: number;
}

export interface CustomerSummaryData {
  customers: CustomerSummaryRow[];
  customerPartners: CustomerPartnerRow[];
  partners: CustomerSummaryPartnerRollup[];
  totals: CustomerSummaryTotals;
  filters: {
    period: string;
    from: string;
    to: string;
    paymentStatus: string;
    search: string;
  };
}

/** یک ردیف معاملهٔ انفرادی در راپور مشتری */
export interface CustomerDetailRow {
  id: number;
  issueDate: string;
  partName: string | null;
  partNumber: string | null;
  partnerName: string | null;
  quantity: number;
  /** ارزش ناخالص فاکتور */
  amount: number;
  discount: number;
  paid: number;
  outstanding: number;
  isFullyPaid: boolean;
  issuedBy: string | null;
  isExternal: boolean;
}

export interface CustomerDetailTotals {
  salesCount: number;
  quantity: number;
  amount: number;
  discount: number;
  paid: number;
  outstanding: number;
}

/** دادهٔ کامل راپور انفرادی یک مشتری */
export interface CustomerDetailData {
  customer: CustomerSummaryRow | null;
  partners: CustomerPartnerRow[];
  rows: CustomerDetailRow[];
  totals: CustomerDetailTotals;
  filters: {
    period: string;
    from: string;
    to: string;
    paymentStatus: string;
    search: string;
  };
}
