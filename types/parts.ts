export type Part = {
  id: number;
  partNumber: string;
  name: string;
  section: string; // Changed from enum to string for flexibility
  minStock: number;
  costPrice: string | null;
  salePrice: string | null;
  active: boolean;
  createdAt: string;
  currentStock?: number; // Added to match API response with real stock data
};

export type CreatePartInput = {
  partNumber: string;
  name: string;
  section?: string; // Changed from enum to string for flexibility
  minStock?: number;
  currentStock?: number;
  costPrice?: string;
  salePrice?: string;
  active?: boolean;
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
};

export type PartDetailsResponse = {
  success: boolean;
  data: Part & {
    currentStock: number;
    recentTransactions: any[];
    isLowStock: boolean;
  };
};
