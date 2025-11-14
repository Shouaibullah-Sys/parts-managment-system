// app/dashboard/staff/page.tsx
"use client";

import Link from "next/link";
import { Package, FileText, BarChart3, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffDashboard() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 bg-linear-to-r from-primary to-primary/80 bg-clip-text">
          Staff Dashboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage parts inventory, track stock levels, and assist with daily
          operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-mechanical">
          <Link href="/parts/manage">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  Parts Management
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View and search parts inventory, check stock levels, and view
                part details
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-mechanical">
          <Link href="/issue-parts">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                    <ShoppingCart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  Issue Parts
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Search parts, create issue orders for customers, and generate
                bills
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-mechanical">
          <Link href="/issue-records">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  Issue Records
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View all parts issue records and transaction history
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-mechanical">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                Reports
              </CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Generate inventory reports, stock analysis, and sales summaries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-mechanical">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/parts/manage">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Package className="h-4 w-4 mr-2" />
                Browse Parts
              </Button>
            </Link>
            <Link href="/issue-parts">
              <Button
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Issue Parts
              </Button>
            </Link>
            <Link href="/issue-records">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Records
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
