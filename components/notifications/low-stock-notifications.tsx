// components/notifications/low-stock-notifications.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  X,
  Package,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import Link from "next/link";
import Loader from "@/components/loader";

interface LowStockNotification {
  id: number;
  part_number: string;
  name: string;
  section: string;
  min_stock: number;
  current_stock: number;
  deficit: number;
  priority: "high" | "medium" | "low";
}

interface NotificationsData {
  notifications: LowStockNotification[];
  total: number;
  critical: number;
  warning: number;
  info: number;
}

const fetchLowStockNotifications = async (): Promise<NotificationsData> => {
  const response = await fetch("/api/notifications/low-stock");
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const result = await response.json();
  return result.data;
};

export function LowStockNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["low-stock-notifications"],
    queryFn: fetchLowStockNotifications,
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: true,
  });

  // Show toast when new critical notifications arrive
  useEffect(() => {
    if (data && data.notifications.length > 0) {
      const criticalCount = data.notifications.filter(
        (n) => n.priority === "high"
      ).length;

      if (criticalCount > 0 && criticalCount > lastNotificationCount) {
        toast.error(`هشدار: ${criticalCount} قطعه در وضعیت بحرانی موجودی!`, {
          duration: 10000,
          action: {
            label: "مشاهده",
            onClick: () => setIsOpen(true),
          },
        });
      }

      setLastNotificationCount(criticalCount);
    }
  }, [data, lastNotificationCount]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "low":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="destructive" className="text-xs">
            بحرانی
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-orange-50 text-orange-700 border-orange-200"
          >
            هشدار
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            توجه
          </Badge>
        );
      default:
        return null;
    }
  };

  if (error) {
    return null; // Don't show notifications if there's an error
  }

  const totalNotifications = data?.total || 0;
  const criticalCount = data?.critical || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative border-border hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span
                  className={`relative inline-flex rounded-full h-5 w-5 text-xs items-center justify-center text-white ${
                    criticalCount > 0 ? "bg-red-600" : "bg-orange-600"
                  }`}
                >
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </span>
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h4 className="font-semibold">هشدارهای موجودی</h4>
          </div>
          <div className="flex items-center gap-2">
            {totalNotifications > 0 && (
              <Badge variant={criticalCount > 0 ? "destructive" : "outline"}>
                {totalNotifications}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader
                title="در حال بارگذاری هشدارها..."
                subtitle="لطفاً منتظر بمانید"
                size="sm"
              />
            </div>
          ) : totalNotifications === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                هیچ هشداری وجود ندارد
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                همه قطعات در سطح مناسب موجودی هستند
              </p>
            </div>
          ) : (
            <div className="p-2">
              {data?.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border mb-2 transition-colors hover:bg-accent/50 ${
                    notification.priority === "high"
                      ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                      : notification.priority === "medium"
                        ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20"
                        : "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      {getPriorityIcon(notification.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm truncate">
                            {notification.name}
                          </h5>
                          {getPriorityBadge(notification.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">
                          {notification.part_number}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">
                            حداقل:{" "}
                            {notification.min_stock.toLocaleString("fa-IR")}
                          </span>
                          <span
                            className={
                              notification.current_stock === 0
                                ? "text-red-600 font-bold"
                                : "text-orange-600"
                            }
                          >
                            موجود:{" "}
                            {notification.current_stock.toLocaleString("fa-IR")}
                          </span>
                          <span className="text-red-600 font-medium">
                            کمبود:{" "}
                            {notification.deficit.toLocaleString("fa-IR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {totalNotifications > 0 && (
          <div className="p-3 border-t">
            <Button asChild className="w-full" size="sm">
              <Link
                href="/parts/priority-actions"
                onClick={() => setIsOpen(false)}
              >
                <Package className="h-4 w-4 ml-2" />
                مدیریت اقدامات اولویت‌دار
              </Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
