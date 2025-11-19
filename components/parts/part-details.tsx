"use client";

import { useState, useEffect } from "react";
import { usePart } from "@/hooks/use-parts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Box,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import Loader from "../loader";

interface PartDetailsProps {
  partId: number;
}

export function PartDetails({ partId }: PartDetailsProps) {
  const { data: session } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const { data: partResponse, isLoading, error } = usePart(partId);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => setUserRole(data.role))
        .catch((error) => console.error("Error fetching user role:", error));
    }
  }, [session?.user]);

  const isAdmin = userRole === "admin";

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-6 flex justify-center">
        <Loader
          title="در حال بارگذاری جزئیات قطعه..."
          subtitle="لطفاً منتظر بمانید"
          size="sm"
        />
      </div>
    );
  }

  if (error || !partResponse?.data) {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              قطعه یافت نشد یا خطا در بارگذاری جزئیات قطعه.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const part = partResponse.data;

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/parts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{part.name}</h1>
          <p className="text-muted-foreground">شماره قطعه: {part.partNumber}</p>
        </div>
        {isAdmin && (
          <Link href={`/parts/${part.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              ویرایش قطعه
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                اطلاعات قطعه
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    شماره قطعه
                  </label>
                  <p className="font-mono">{part.partNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    بخش
                  </label>
                  <div>
                    <Badge variant="outline">{part.section}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    حداقل موجودی
                  </label>
                  <p>{part.minStock}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    وضعیت
                  </label>
                  <div>
                    <Badge variant={part.active ? "default" : "secondary"}>
                      {part.active ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                قیمت‌گذاری
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    قیمت خرید
                  </label>
                  <p className="text-lg font-mono">
                    {part.costPrice
                      ? `${parseFloat(part.costPrice).toFixed(2)}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    قیمت فروش
                  </label>
                  <p className="text-lg font-mono">
                    {part.salePrice
                      ? `${parseFloat(part.salePrice).toFixed(2)}`
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                وضعیت موجودی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    موجودی فعلی
                  </span>
                  <span className="font-mono font-bold">
                    {part.currentStock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    حداقل موجودی
                  </span>
                  <span className="font-mono">{part.minStock}</span>
                </div>
                {part.isLowStock && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      هشدار موجودی کم
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>فعالیت‌های اخیر</CardTitle>
              <CardDescription>آخرین ۱۰ تراکنش</CardDescription>
            </CardHeader>
            <CardContent>
              {part.recentTransactions && part.recentTransactions.length > 0 ? (
                <div className="space-y-2">
                  {part.recentTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between text-sm"
                    >
                      <span>{transaction.reason}</span>
                      <span
                        className={
                          transaction.change > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {transaction.change > 0 ? "+" : ""}
                        {transaction.change}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  فعالیت اخیری وجود ندارد
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
