// app/parts/page.tsx

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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Parts Management
          </h1>
          <p className="text-muted-foreground">
            Manage your inventory parts and stock levels
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          {isAdmin && (
            <>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Part
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Parts
              </p>
              <p className="text-2xl font-bold">--</p>
            </div>
            <div className="p-2 bg-primary/10 rounded">
              <Plus className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Parts
              </p>
              <p className="text-2xl font-bold">--</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded">
              <div className="h-4 w-4 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Low Stock
              </p>
              <p className="text-2xl font-bold">--</p>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded">
              <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Out of Stock
              </p>
              <p className="text-2xl font-bold">--</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded">
              <div className="h-4 w-4 bg-red-500 rounded-full"></div>
            </div>
          </div>
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
