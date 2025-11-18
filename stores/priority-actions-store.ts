// stores/priority-actions-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LowStockPart {
  id: number;
  part_number: string;
  name: string;
  section: string;
  min_stock: number;
  current_stock: number;
  cost_price: string;
  sale_price: string;
  requested_quantity: number;
  deficit: number;
  total_cost: number;
  selected: boolean;
  last_exported?: string;
}

interface PriorityActionsState {
  parts: LowStockPart[];
  isLoading: boolean;
  error: string | null;
  importData: any[];

  // Actions
  setParts: (parts: LowStockPart[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePart: (id: number, updates: Partial<LowStockPart>) => void;
  updateSelected: (id: number, selected: boolean) => void;
  updateSelectAll: (selected: boolean) => void;
  updateQuantity: (id: number, quantity: number) => void;
  bulkSetQuantity: (quantity: number) => void;
  bulkCalculateForDeficit: () => void;
  clearAllRequestedQuantities: () => void;
  resetParts: () => void;
  importFromExcel: (excelData: any[]) => void;
  setImportData: (data: any[]) => void;
}

export const usePriorityActionsStore = create<PriorityActionsState>()(
  persist(
    (set, get) => ({
      parts: [],
      importData: [],
      isLoading: false,
      error: null,

      setParts: (parts) => set({ parts }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      updatePart: (id, updates) =>
        set((state) => ({
          parts: state.parts.map((part) =>
            part.id === id ? { ...part, ...updates } : part
          ),
        })),

      updateSelected: (id, selected) =>
        set((state) => ({
          parts: state.parts.map((part) =>
            part.id === id ? { ...part, selected } : part
          ),
        })),

      updateSelectAll: (selected) =>
        set((state) => ({
          parts: state.parts.map((part) => ({ ...part, selected })),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          const updatedParts = state.parts.map((part) => {
            if (part.id === id) {
              const requestedQuantity = Math.max(0, quantity);
              const totalCost =
                requestedQuantity * parseFloat(part.cost_price || "0");
              return {
                ...part,
                requested_quantity: requestedQuantity,
                total_cost: totalCost,
              };
            }
            return part;
          });
          return { parts: updatedParts };
        }),

      bulkSetQuantity: (quantity) =>
        set((state) => {
          const updatedParts = state.parts.map((part) => {
            if (part.selected) {
              const requestedQuantity = Math.max(0, quantity);
              const totalCost =
                requestedQuantity * parseFloat(part.cost_price || "0");
              return {
                ...part,
                requested_quantity: requestedQuantity,
                total_cost: totalCost,
              };
            }
            return part;
          });
          return { parts: updatedParts };
        }),

      bulkCalculateForDeficit: () =>
        set((state) => {
          const updatedParts = state.parts.map((part) => {
            if (part.selected) {
              const requestedQuantity = part.deficit;
              const totalCost =
                requestedQuantity * parseFloat(part.cost_price || "0");
              return {
                ...part,
                requested_quantity: requestedQuantity,
                total_cost: totalCost,
              };
            }
            return part;
          });
          return { parts: updatedParts };
        }),

      clearAllRequestedQuantities: () =>
        set((state) => ({
          parts: state.parts.map((part) => ({
            ...part,
            requested_quantity: 0,
            total_cost: 0,
          })),
        })),

      resetParts: () => set({ parts: [] }),

      importFromExcel: (excelData) =>
        set((state) => {
          const updatedParts = state.parts.map((part) => {
            const importedPart = excelData.find(
              (item) => item.part_number === part.part_number
            );

            if (importedPart && importedPart.requested_quantity > 0) {
              const requestedQuantity = importedPart.requested_quantity;
              const totalCost =
                requestedQuantity * parseFloat(part.cost_price || "0");

              return {
                ...part,
                requested_quantity: requestedQuantity,
                total_cost: totalCost,
                selected: true,
              };
            }
            return part;
          });

          return {
            parts: updatedParts,
            importData: excelData,
          };
        }),

      setImportData: (data) => set({ importData: data }),
    }),
    {
      name: "priority-actions-store",
      partialize: (state) => ({
        parts: state.parts,
        importData: state.importData,
      }),
    }
  )
);
