export type Part = {
  id: number;
  partNumber: string;
  name: string;
  section: string; // Changed from enum to string for flexibility
  minStock: number;
  currentStock: number; // Added missing currentStock field
  costPrice: string | null;
  salePrice: string | null;
  active: boolean;
  createdAt: Date;
};

export type CreatePartInput = {
  partNumber: string;
  name: string;
  section?: string; // Changed from enum to string for flexibility
  minStock?: number;
  currentStock?: number; // Added missing currentStock field
  costPrice?: string;
  salePrice?: string;
  active?: boolean;
};

export type UpdatePartInput = Partial<CreatePartInput>;
