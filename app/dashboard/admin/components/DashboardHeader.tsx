import { Button } from "@/components/ui/button";
import { RefreshCw, CalendarIcon } from "lucide-react";

interface DashboardHeaderProps {
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const DashboardHeader = ({
  lastUpdated,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          داشبورد مدیریت
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          نمای کلی جامع از عملکرد کسب و کار شما
        </p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="text-xs sm:text-sm text-muted-foreground shrink-0">
          آخرین بروزرسانی: {lastUpdated.toLocaleTimeString("fa-IR")}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 shrink-0"
        >
          {isRefreshing ? (
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline">بروزرسانی</span>
        </Button>
      </div>
    </div>
  );
};
