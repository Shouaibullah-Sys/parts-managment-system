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

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      roles: ["admin", "staff"],
    },
    {
      name: "Parts Management",
      href: "/parts",
      icon: Package,
      roles: ["admin", "staff"],
    },
    ...(user.role === "admin"
      ? [
          {
            name: "User Management",
            href: "/dashboard/admin",
            icon: Users,
            roles: ["admin"],
          },
        ]
      : []),
    ...(user.role === "admin"
      ? [
          {
            name: "Settings",
            href: "/dashboard/admin",
            icon: Settings,
            roles: ["admin"],
          },
        ]
      : []),
  ];

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
        <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-73px)] mt-[73px]">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(item.href);

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 ${
                      active
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 mt-[73px]">{children}</main>
      </div>
    </div>
  );
}
