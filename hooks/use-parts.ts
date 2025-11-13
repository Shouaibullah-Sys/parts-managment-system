// hooks/use-parts.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Part,
  CreatePartInput,
  UpdatePartInput,
  PartsResponse,
  PartDetailsResponse,
} from "@/types/parts";

// Fetch parts with filters
export function useParts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  section?: string;
  active?: boolean;
}) {
  return useQuery({
    queryKey: ["parts", params],
    queryFn: async (): Promise<PartsResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.search) searchParams.append("search", params.search);
      if (params?.section) searchParams.append("section", params.section);
      if (params?.active !== undefined)
        searchParams.append("active", params.active.toString());

      const response = await fetch(`/api/parts?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch parts");
      return response.json();
    },
  });
}

// Fetch single part
export function usePart(id: number) {
  return useQuery({
    queryKey: ["part", id],
    queryFn: async (): Promise<PartDetailsResponse> => {
      const response = await fetch(`/api/parts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch part");
      return response.json();
    },
    enabled: !!id,
  });
}

// Fetch low stock parts
export function useLowStockParts() {
  return useQuery({
    queryKey: ["parts", "low-stock"],
    queryFn: async (): Promise<PartsResponse> => {
      const response = await fetch("/api/parts/low-stock");
      if (!response.ok) throw new Error("Failed to fetch low stock parts");
      return response.json();
    },
  });
}

// Create part mutation
export function useCreatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partData: CreatePartInput): Promise<Part> => {
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create part");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
    },
  });
}

// Update part mutation
export function useUpdatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePartInput;
    }): Promise<Part> => {
      const response = await fetch(`/api/parts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update part");
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["part", variables.id] });
    },
  });
}

// Delete part mutation
export function useDeletePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/parts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete part");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
    },
  });
}
