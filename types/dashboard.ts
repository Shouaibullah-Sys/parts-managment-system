export interface DashboardStats {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  totalCustomers: number;
  totalParts: number;
  lowStockCount: number;
  todaySales: number;
  monthlySales: number;
  paymentCompletionRate: number;
}

export interface LowStockItem {
  id: number;
  part_number: string;
  name: string;
  min_stock: number;
  current_stock: number;
  section: string;
  cost_price: string;
  sale_price: string;
}

export interface SalesTrend {
  date: string;
  sales: number;
  payments: number;
}

export interface PaymentStatus {
  fullyPaid: number;
  partiallyPaid: number;
  notPaid: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}
