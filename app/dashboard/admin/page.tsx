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
import {
  Users,
  UserCheck,
  Shield,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Loader from "@/components/loader";

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
      return <Badge variant="destructive">Pending Approval</Badge>;
    }
    if (user.role === "admin") {
      return (
        <Badge className="bg-primary text-primary-foreground border-primary">
          Admin
        </Badge>
      );
    }
    return <Badge variant="secondary">Staff</Badge>;
  };

  const getVerificationBadge = (user: User) => {
    if (user.emailVerified) {
      return (
        <Badge
          variant="outline"
          className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400"
        >
          Verified
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-amber-600 border-amber-600 dark:text-amber-400 dark:border-amber-400"
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
        <Loader
          title="در حال بارگذاری دشبورد ادمین..."
          subtitle="لطفاً منتظر بمانید"
          size="md"
        />
      </div>
    );
  }

  if (error && userRole !== "admin") {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => router.push("/dashboard/staff")}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Go to Staff Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 bg-linear-to-r from-primary to-primary/80 bg-clip-text text-shadow-gray-500">
          Admin Dashboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage users, roles, and system permissions for your car parts shop
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertDescription className="text-destructive font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-mechanical border-mechanical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {users.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {users.filter((u) => !u.approved).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950">
                <UserCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-mechanical border-mechanical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Administrators
                </p>
                <p className="text-3xl font-bold text-primary">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Card */}
      <Card className="border-mechanical">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              User Management
            </CardTitle>
            <Button
              onClick={fetchUsers}
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              System Users ({users.length})
            </h3>

            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No users found in the system</p>
                  <p className="text-sm mt-2">
                    Users will appear here once they register
                  </p>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/30 transition-all duration-200 bg-card"
                  >
                    <div className="flex-1 mb-4 sm:mb-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h4 className="font-semibold text-foreground text-lg">
                          {user.name}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(user)}
                          {getVerificationBadge(user)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Email:</span>{" "}
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Joined:</span>{" "}
                          {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role Change */}
                      <Select
                        value={user.role}
                        onValueChange={(value: "staff" | "admin") =>
                          handleUpdateRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-32 border-border focus:ring-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                          <SelectItem value="staff" className="focus:bg-accent">
                            Staff
                          </SelectItem>
                          <SelectItem value="admin" className="focus:bg-accent">
                            Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Approve Button */}
                      {!user.approved && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                          onClick={() => handleApproveUser(user.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}

                      {/* Delete Button */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        className="hover:bg-destructive/90"
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

      {/* Footer Stats */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Managing {users.length} users •{" "}
          {users.filter((u) => u.approved).length} approved •{" "}
          {users.filter((u) => u.emailVerified).length} verified
        </p>
      </div>
    </div>
  );
}
