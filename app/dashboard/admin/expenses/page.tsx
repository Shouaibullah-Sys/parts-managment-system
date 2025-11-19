// app/dashboard/admin/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DollarSign, Plus, RefreshCw } from "lucide-react";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpenseForm } from "@/components/forms/expense-form";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Loader from "@/components/loader";

export default function AdminExpensesPage() {
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => setUserRole(data.role))
        .catch((error) => console.error("Error fetching user role:", error));
    }
  }, [session?.user]);

  const isAdmin = userRole === "admin";

  const handleAddExpense = async () => {
    if (!isAdmin) {
      toast.error("شما اجازه اضافه کردن مصارف را ندارید");
      return;
    }
    setIsAddDialogOpen(true);
  };

  const handleExpenseAdded = () => {
    setIsAddDialogOpen(false);
    // The table will automatically refresh via the onSubmit callback
  };

  const refreshExpenses = async () => {
    setIsRefreshing(true);
    // Force a page refresh to reload all data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            مدیریت مصارف روزانه
          </h1>
          <p className="text-muted-foreground mt-2">
            پیگیری و مدیریت مصارف و هزینه‌های روزانه کسب و کار
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshExpenses}
            disabled={isRefreshing}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            تازه سازی
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleAddExpense}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              اضافه کردن مصرف
            </Button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <ExpensesTable />

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              اضافه کردن مصرف جدید
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center text-muted-foreground mb-4">
                جزئیات مصرف را در زیر وارد کنید
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ExpenseForm onSubmit={handleExpenseAdded} className="space-y-4" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
