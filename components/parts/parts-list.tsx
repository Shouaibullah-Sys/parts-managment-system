"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import Loader from "../loader";

interface Part {
  id: number;
  partNumber: string;
  name: string;
  section: "E" | "D" | "F" | "G" | "OLD";
  minStock: number;
  costPrice: string | null;
  salePrice: string | null;
  active: boolean;
  createdAt: string;
}

interface PartsListProps {
  initialParts: Part[];
  initialPagination: any;
}

export function PartsList({ initialParts, initialPagination }: PartsListProps) {
  const { data: session } = authClient.useSession();
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    section: "",
    active: "",
  });

  // Fetch user role when session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/user/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUserRole(data.user.role);
          }
        })
        .catch((error) => {
          console.error("Error fetching user role:", error);
        });
    } else {
      setUserRole(null);
    }
  }, [session?.user?.id]);

  const isAdmin = userRole === "admin";

  const fetchParts = async (page: number = 1, newFilters = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...newFilters,
      });

      const response = await fetch(`/api/parts?${params}`);
      const data = await response.json();

      if (data.success) {
        setParts(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching parts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchParts(1, newFilters);
  };

  const handlePageChange = (page: number) => {
    fetchParts(page);
  };

  const handleDeletePart = async (partId: number) => {
    if (!confirm("Are you sure you want to delete this part?")) return;

    try {
      const response = await fetch(`/api/parts/${partId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the parts list
        fetchParts(pagination.page);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error deleting part:", error);
      alert("Error deleting part");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Parts Management</h1>
        {isAdmin && (
          <button
            onClick={() => {
              /* Add create part modal logic */
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Part
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by part number or name..."
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          className="px-3 py-2 border rounded-md w-64"
        />
        <select
          value={filters.section}
          onChange={(e) => handleFilterChange("section", e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Sections</option>
          <option value="E">Section E</option>
          <option value="D">Section D</option>
          <option value="F">Section F</option>
          <option value="G">Section G</option>
          <option value="OLD">OLD</option>
        </select>
        <select
          value={filters.active}
          onChange={(e) => handleFilterChange("active", e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader
            title="در حال بارگذاری قطعات..."
            subtitle="لطفاً منتظر بمانید"
            size="sm"
          />
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {part.partNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.minStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.costPrice || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.salePrice || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          part.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {part.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            /* Add edit logic */
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePart(part.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}(
              {pagination.total} total parts)
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
