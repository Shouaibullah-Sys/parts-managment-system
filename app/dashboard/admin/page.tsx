import { startOfMonth } from "date-fns";
import { DashboardClient } from "./components/DashboardClient";
import {
  fetchDashboardStats,
  fetchLowStockItems,
  fetchSalesTrend,
  fetchPaymentStatus,
  fetchExpenseReports,
} from "@/lib/api/dashboard";

export default async function AdminDashboard() {
  // Server-side data fetching
  const initialDateRange = {
    from: startOfMonth(new Date()),
    to: new Date(),
  };

  try {
    // Fetch all data in parallel on the server
    const [stats, lowStockItems, salesTrend, paymentStatus, expenseReports] =
      await Promise.all([
        fetchDashboardStats(initialDateRange),
        fetchLowStockItems(),
        fetchSalesTrend(initialDateRange),
        fetchPaymentStatus(initialDateRange),
        fetchExpenseReports(initialDateRange),
      ]);

    return (
      <DashboardClient
        initialStats={stats}
        initialLowStockItems={lowStockItems}
        initialSalesTrend={salesTrend}
        initialPaymentStatus={paymentStatus}
        initialExpenseReports={expenseReports}
        initialDateRange={initialDateRange}
      />
    );
  } catch (error) {
    console.error("Error in admin dashboard:", error);
    // Let the error boundary handle it
    throw error;
  }
}

export const dynamic = "force-dynamic";
