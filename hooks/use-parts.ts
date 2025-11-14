import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Part,
  CreatePartInput,
  UpdatePartInput,
  PartsResponse,
  PartDetailsResponse,
} from "@/types/parts";

// Fetch parts with filters
export function useParts(
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    section?: string;
    active?: boolean;
  },
  options?: any
) {
  return useQuery({
    queryKey: ["parts", params],
    queryFn: async (): Promise<PartsResponse> => {
      console.log("Fetching parts with params:", params);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.search) searchParams.append("search", params.search);
      if (params?.section) searchParams.append("section", params.section);
      if (params?.active !== undefined)
        searchParams.append("active", params.active.toString());

      const response = await fetch(`/api/parts?${searchParams}`, {
        credentials: "include", // This is crucial for authentication
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(
          `Failed to fetch parts: ${response.status} ${errorText}`
        );
      }
      const data = await response.json();
      console.log("Parts fetched:", data);
      return data;
    },
    placeholderData: (previousData) => previousData, // Replaces keepPreviousData in v5
    refetchOnWindowFocus: true, // Always refetch when window gains focus
    refetchOnMount: true, // Always refetch when component mounts
    ...options,
  });
}

// Fetch parts statistics
export function usePartsStats() {
  return useQuery({
    queryKey: ["parts", "stats"],
    queryFn: async (): Promise<{
      total: number;
      active: number;
      lowStock: number;
      outOfStock: number;
    }> => {
      try {
        const [allResponse, activeResponse, lowStockResponse] =
          await Promise.all([
            fetch("/api/parts?limit=1", { credentials: "include" }),
            fetch("/api/parts?active=true&limit=1", { credentials: "include" }),
            fetch("/api/parts/low-stock", { credentials: "include" }),
          ]);

        if (!allResponse.ok || !activeResponse.ok || !lowStockResponse.ok) {
          throw new Error("Failed to fetch parts statistics");
        }

        const [allData, activeData, lowStockData] = await Promise.all([
          allResponse.json(),
          activeResponse.json(),
          lowStockResponse.json(),
        ]);

        return {
          total: allData.pagination?.total || 0,
          active: activeData.pagination?.total || 0,
          lowStock: lowStockData.data?.length || 0,
          outOfStock: 0, // Placeholder - you can implement this later
        };
      } catch (error) {
        console.error("Error fetching parts stats:", error);
        throw error;
      }
    },
  });
}

// Fetch single part
export function usePart(id: number) {
  return useQuery({
    queryKey: ["part", id],
    queryFn: async (): Promise<PartDetailsResponse> => {
      const response = await fetch(`/api/parts/${id}`, {
        credentials: "include", // Include authentication cookies
      });
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
      const response = await fetch("/api/parts/low-stock", {
        credentials: "include", // Include authentication cookies
      });
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
      console.log("Creating part:", partData);
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include authentication cookies
        body: JSON.stringify(partData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create part");
      console.log("Part created successfully:", data.data);
      return data.data;
    },
    onSuccess: (newPart) => {
      console.log("Invalidating parts queries after successful creation");

      // Remove cached data to force fresh fetch
      queryClient.removeQueries({ queryKey: ["parts"] });

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ["parts", "stats"] });

      // Force refetch of parts list
      queryClient.refetchQueries({ queryKey: ["parts"] });
    },
    onError: (error: Error) => {
      console.error("Error creating part:", error);
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
        credentials: "include", // Include authentication cookies
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update part");
      return result.data;
    },
    onSuccess: (updatedPart, variables) => {
      // Update the specific part in cache
      queryClient.setQueryData(["part", variables.id], {
        success: true,
        data: updatedPart,
      });

      // Invalidate parts list and related queries
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["parts", "stats"] });
    },
    onError: (error: Error, variables) => {
      console.error(`Error updating part ${variables.id}:`, error);
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
        credentials: "include", // Include authentication cookies
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete part");
      }
    },
    onSuccess: (_, id) => {
      // Remove the part from cache
      queryClient.removeQueries({ queryKey: ["part", id] });

      // Invalidate parts list and stats
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["parts", "stats"] });
    },
    onError: (error: Error, id) => {
      console.error(`Error deleting part ${id}:`, error);
    },
  });
}

// Toggle part active status (simplified version)
export function useTogglePartActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      active,
    }: {
      id: number;
      active: boolean;
    }): Promise<Part> => {
      const response = await fetch(`/api/parts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include authentication cookies
        body: JSON.stringify({ active }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update part status");
      return result.data;
    },
    onSuccess: (updatedPart) => {
      // Update the part in cache
      queryClient.setQueryData(["part", updatedPart.id], {
        success: true,
        data: updatedPart,
      });

      // Invalidate parts list and stats
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["parts", "stats"] });
    },
  });
}
