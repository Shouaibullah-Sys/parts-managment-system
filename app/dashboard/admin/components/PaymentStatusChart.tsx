"use client";

import { PaymentStatus } from "@/types/dashboard";

interface PaymentStatusChartProps {
  data: PaymentStatus;
}

export const PaymentStatusChart = ({ data }: PaymentStatusChartProps) => {
  const total = data.fullyPaid + data.partiallyPaid + data.notPaid;

  if (total === 0)
    return (
      <div className="text-center text-muted-foreground">
        داده‌ای موجود نیست
      </div>
    );

  return (
    <div className="w-full h-48 flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 sm:w-32 sm:h-32">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold">
              {total.toLocaleString("fa-IR")}
            </div>
            <div className="text-xs text-muted-foreground">مجموع</div>
          </div>
        </div>
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#22c55e"
            strokeWidth="20"
            strokeDasharray={`${(data.fullyPaid / total) * 251.2} 251.2`}
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#f59e0b"
            strokeWidth="20"
            strokeDasharray={`${(data.partiallyPaid / total) * 251.2} 251.2`}
            strokeDashoffset={-(data.fullyPaid / total) * 251.2}
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#ef4444"
            strokeWidth="20"
            strokeDasharray={`${(data.notPaid / total) * 251.2} 251.2`}
            strokeDashoffset={
              -((data.fullyPaid + data.partiallyPaid) / total) * 251.2
            }
            fill="none"
          />
        </svg>
      </div>
      <div className="mt-4 space-y-2 w-full px-2">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded"></div>
            <span>پرداخت کامل</span>
          </div>
          <span className="font-medium">
            {data.fullyPaid.toLocaleString("fa-IR")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded"></div>
            <span>پرداخت جزئی</span>
          </div>
          <span className="font-medium">
            {data.partiallyPaid.toLocaleString("fa-IR")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded"></div>
            <span>پرداخت نشده</span>
          </div>
          <span className="font-medium">
            {data.notPaid.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>
    </div>
  );
};
