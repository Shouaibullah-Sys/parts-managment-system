"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-destructive mb-2">
          خطا در بارگذاری داشبورد
        </h2>
        <p className="text-muted-foreground mb-4">
          بارگذاری اطلاعات داشبورد با خطا مواجه شد
        </p>
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تلاش مجدد
        </Button>
      </div>
    </div>
  );
}
