"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkIndex, setCheckIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const checkUserAndRole = async () => {
      setLoadError(null);
      try {
        const session = await authClient.getSession();
        if (cancelled) return;

        if (!session.data?.user) {
          if (!session.failed) {
            router.push("/login");
          } else {
            setLoadError("خطا در بررسی احراز هویت. لطفاً دوباره تلاش کنید.");
            setLoading(false);
          }
          return;
        }

        const u = session.data.user;

        if (!u.approved) {
          await authClient.signOut();
          if (!cancelled) router.push("/login");
          return;
        }

        if (cancelled) return;

        setUser({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as "staff" | "admin",
          approved: u.approved,
        });
        setLoading(false);

        // Role-based routing for the dashboard index
        if (pathname === "/dashboard" || pathname === "/dashboard/") {
          router.replace(
            u.role === "admin" ? "/dashboard/admin" : "/dashboard/staff"
          );
          return;
        }

        // Check access to admin routes
        if (pathname.startsWith("/dashboard/admin") && u.role !== "admin") {
          router.replace("/dashboard/staff");
        }
      } catch (error) {
        console.error("Error checking user:", error);
        if (!cancelled) {
          setLoadError("خطا در بررسی احراز هویت. لطفاً دوباره تلاش کنید.");
          setLoading(false);
        }
      }
    };

    checkUserAndRole();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, checkIndex]);

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

  if (loadError) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button
            onClick={() => {
              setLoadError(null);
              setLoading(true);
              setCheckIndex((i) => i + 1);
            }}
          >
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
