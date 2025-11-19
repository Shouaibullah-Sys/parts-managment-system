// app/dashboard/staff/page.tsx
"use client";

import { Package, FileText, BarChart3, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function StaffDashboard() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 bg-linear-to-r from-primary to-primary/80 bg-clip-text">
          دشبورد کارمند
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          مدیریت موجودی قطعات، پیگیری سطح موجودی و کمک به عملیات روزانه
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-mechanical">
          <Link href="/parts/manage">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  مدیریت قطعات
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  مشاهده
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                مشاهده و جستجوی موجودی قطعات، بررسی سطح موجودی و مشاهده جزئیات
                قطعات
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-mechanical">
          <Link href="/parts/issue">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                    <ShoppingCart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  صدور قطعات
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  مشاهده
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                جستجوی قطعات، ایجاد سفارشات صدور برای مشتریان و تولید صورتحساب
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-mechanical">
          <Link href="/parts/records">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  سوابق صدور
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  مشاهده
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                مشاهده تمام سوابق صدور قطعات و تاریخچه تراکنش‌ها
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
