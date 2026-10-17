export type PartPartnerInfo = {
  id: number;
  name: string;
  percentage: string | null;
};

export type Part = {
  id: number;
  partNumber: string;
  name: string;
  shelf: string | null; // طاقچه — shelf location
  minStock: number;
  costPrice: string | null;
  salePrice: string | null;
  active: boolean;
  createdAt: string;
  currentStock?: number; // Added to match API response with real stock data
  partnerId?: number | null;
  partner?: PartPartnerInfo | null; // شراکت انتخابشده برای این قطعه
};

export type CreatePartInput = {
  partNumber: string;
  name: string;
  shelf?: string | null; // طاقچه — shelf location
  minStock?: number;
  currentStock?: number;
  costPrice?: string;
  salePrice?: string;
  active?: boolean;
  partnerId?: number | null;
};

export type UpdatePartInput = Partial<CreatePartInput>;

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PartsResponse = {
  success: boolean;
  data: Part[];
  pagination: PaginationInfo;
  /** ارزش انبار: مجموع (قیمت × موجودی) روی همهٔ ردیف‌های فیلترشده */
  summary?: {
    totalCostValue: number;
    totalSaleValue: number;
  };
};

export type PartDetailsResponse = {
  success: boolean;
  data: Part & {
    currentStock: number;
    recentTransactions: any[];
    isLowStock: boolean;
  };
};
