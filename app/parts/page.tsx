"use client";

import { PartsTable } from "@/components/parts/parts-table";
import { Part } from "@/types/parts";

export default function PartsPage() {
  const handleEditPart = (part: Part) => {
    // Handle edit part - you can implement a modal or separate page
    console.log("Edit part:", part);
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
      </div>

      <PartsTable onEdit={handleEditPart} />
    </div>
  );
}
