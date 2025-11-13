"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserCheck, Shield, Trash2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "staff" | "admin";
  approved: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.status === 403) {
          setError("Access denied. Admin privileges required.");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const session = await authClient.getSession();
        if (!session?.data?.user) {
          router.push("/login");
          return;
        }

        // Check user role
        const approvalResponse = await fetch("/api/user/approval-status");
        if (approvalResponse.ok) {
          const { role } = await approvalResponse.json();

          if (role !== "admin") {
            setError("Access denied. Admin privileges required.");
            setLoading(false);
            return;
          }

          setUserRole(role);
          fetchUsers();
        }
      } catch (err) {
        console.error("Error checking admin access:", err);
        router.push("/login");
      }
    };

    checkAdminAccess();
  }, []);

  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve user");
      }

      toast.success("User approved successfully");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to approve user");
      console.error("Error approving user:", err);
    }
  };

  const handleUpdateRole = async (
    userId: string,
    newRole: "staff" | "admin"
  ) => {
    try {
      const response = await fetch("/api/admin/users/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user role");
      }

      toast.success("User role updated successfully");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update user role");
      console.error("Error updating user role:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to delete user");
      console.error("Error deleting user:", err);
    }
  };

  const getStatusBadge = (user: User) => {
    if (!user.approved) {
      return <Badge variant="destructive">Pending</Badge>;
    }
    if (user.role === "admin") {
      return <Badge variant="default">Admin</Badge>;
    }
    return <Badge variant="secondary">Staff</Badge>;
  };

  const getVerificationBadge = (user: User) => {
    if (user.emailVerified) {
      return (
        <Badge
          variant="outline"
          className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400"
        >
          Verified
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400"
      >
        Unverified
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && userRole !== "admin") {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button
            onClick={() => router.push("/dashboard/staff")}
            variant="outline"
          >
            Go to Staff Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, roles, and system permissions
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* User Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                All Users ({users.length})
              </h3>
              <Button onClick={fetchUsers} variant="outline" size="sm">
                Refresh
              </Button>
            </div>

            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{user.name}</h4>
                        {getStatusBadge(user)}
                        {getVerificationBadge(user)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDate(user.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role Change */}
                      <Select
                        value={user.role}
                        onValueChange={(value: "staff" | "admin") =>
                          handleUpdateRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Approve Button */}
                      {!user.approved && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveUser(user.id)}
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete Button */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {users.filter((u) => !u.approved).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Administrators
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
