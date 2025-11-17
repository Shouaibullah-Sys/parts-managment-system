"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { authClient } from "@/lib/auth-client";
import { Package, Users, BarChart3, Settings } from "lucide-react";
import Loader from "@/components/loader";

interface User {
  id: string;
  name: string;
  email: string;
  role: "staff" | "admin";
  approved: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUserAndRole = async () => {
      try {
        const session = await authClient.getSession();

        if (!session?.data?.user) {
          router.push("/login");
          return;
        }

        // Check if user is approved
        const approvalResponse = await fetch("/api/user/approval-status");
        if (approvalResponse.ok) {
          const { approved, role } = await approvalResponse.json();

          if (!approved) {
            await authClient.signOut();
            router.push("/login");
            return;
          }

          const userData = {
            id: session.data.user.id,
            name: session.data.user.name,
            email: session.data.user.email,
            role,
            approved,
          };

          setUser(userData);

          // Role-based routing
          if (pathname === "/dashboard" || pathname === "/dashboard/") {
            // Redirect to appropriate dashboard based on role
            if (role === "admin") {
              router.push("/dashboard/admin");
            } else {
              router.push("/dashboard/staff");
            }
          }

          // Check access to admin routes
          if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
            router.push("/dashboard/staff");
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRole();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader
          title="در حال بارگذاری دشبورد..."
          subtitle="لطفاً منتظر بمانید"
          size="md"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Navigation Sidebar */}
      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-6 mt-[73px]">{children}</main>
      </div>
    </div>
  );
}
