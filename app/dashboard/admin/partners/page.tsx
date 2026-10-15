// app/dashboard/admin/partners/page.tsx
"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { PartnersTable } from "@/components/partners/partners-table";
import { PartnerReportView } from "@/components/partners/partner-report-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users } from "lucide-react";

export default function AdminPartnersPage() {
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/role", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setUserRole(data.role))
        .catch((error) => console.error("Error fetching user role:", error));
    }
  }, [session?.user]);

  const isAdmin = userRole === "admin";

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          شرکا
        </h1>
        <p className="text-muted-foreground mt-2">
          گزارش فروش و سود به تفکیک شریک؛ سهم هر شریک از سود فروش قطعات
          منتسب به او بر اساس درصد تعیین‌شده محاسبه می‌شود.
        </p>
      </div>

      <Tabs defaultValue="report" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-2">
          <TabsTrigger value="report" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            گزارش فروش و سود
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-1.5">
            <Users className="h-4 w-4" />
            مدیریت شرکا
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="space-y-4">
          {userRole === null ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              در حال بررسی دسترسی...
            </p>
          ) : isAdmin ? (
            <PartnerReportView />
          ) : (
            <div className="rounded-lg border border-border p-8 text-center space-y-2">
              <p className="font-medium text-destructive">
                دسترسی محدود
              </p>
              <p className="text-sm text-muted-foreground">
                گزارش سود شرکا فقط برای ادمین قابل مشاهده است.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage">
          <PartnersTable isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
