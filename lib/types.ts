export type Part = {
  id: number;
  partNumber: string;
  name: string;
  section: "E" | "D" | "F" | "G" | "OLD";
  minStock: number;
  costPrice: string | null;
  salePrice: string | null;
  active: boolean;
  createdAt: Date;
};

export type CreatePartInput = {
  partNumber: string;
  name: string;
  section?: "E" | "D" | "F" | "G" | "OLD";
  minStock?: number;
  costPrice?: string;
  salePrice?: string;
  active?: boolean;
};

export type UpdatePartInput = Partial<CreatePartInput>;
