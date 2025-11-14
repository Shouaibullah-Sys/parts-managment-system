// app/parts/manage/page.tsx
"use client";

import { PartsTable } from "@/components/parts/parts-table";
import { CreatePartDialog } from "@/components/parts/create-part-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function PartsPage() {
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => setUserRole(data.role))
        .catch((error) => console.error("Error fetching user role:", error));
    }
  }, [session?.user]);

  const isAdmin = userRole === "admin";

  const handlePartCreated = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["parts"] });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["parts"] });
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            مدیریت قطعات
          </h1>
          <p className="text-muted-foreground mt-2">
            مدیریت موجودی قطعات و سطح موجودی
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            بروزرسانی
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Upload className="mr-2 h-4 w-4" />
                وارد کردن
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="mr-2 h-4 w-4" />
                خروجی گرفتن
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" />
                ایجاد قطعه
              </Button>
            </>
          )}
        </div>
      </div>
      <PartsTable />
      <CreatePartDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onPartCreated={handlePartCreated}
      />
    </div>
  );
}
