// app/dashboard/admin/components/DashboardErrorBoundary.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "Dashboard Error Boundary caught an error:",
      error,
      errorInfo
    );

    // Log only in non-browser environments to prevent stdout errors
    if (typeof window === "undefined") {
      console.error("Server-side dashboard error:", error.message);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto py-6 px-3 sm:px-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-xl font-bold text-red-600">
            خطا در بارگذاری داشبورد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              متأسفانه خطایی در بارگذاری داشبورد رخ داده است.
            </p>
            {error && (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm text-left">
                <p className="font-mono text-red-600">{error.message}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={resetError}
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              تلاش مجدد
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              بارگذاری مجدد صفحه
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            اگر مشکل ادامه یافت، لطفاً صفحه را مجدداً بارگذاری کنید یا با
            پشتیبانی تماس بگیرید.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardErrorBoundary;
