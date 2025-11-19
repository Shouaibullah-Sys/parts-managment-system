// app/dashboard/admin/components/ExpenseTrendChart.tsx
"use client";

interface ExpenseTrendData {
  date: string;
  amount: number;
  count: number;
}

interface ExpenseTrendChartProps {
  data: ExpenseTrendData[];
}

export const ExpenseTrendChart = ({ data }: ExpenseTrendChartProps) => {
  const validData =
    data?.filter((item) => item && item.date && item.amount !== undefined) ||
    [];

  if (validData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-muted-foreground">
        <div className="text-center">
          <p>داده‌ای برای نمایش وجود ندارد</p>
          <p className="text-xs mt-1">
            اطلاعات مصارف در بازه انتخاب شده یافت نشد
          </p>
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...validData.map((item) => item.amount), 1);
  const maxValue = maxAmount;

  return (
    <div className="w-full h-48 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 pt-8 px-2 relative">
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0.2, 0.4, 0.6, 0.8, 1].map((line, index) => (
          <div
            key={index}
            className="border-t border-gray-200 dark:border-gray-700 w-full"
          />
        ))}
      </div>

      {validData.map((item, index) => (
        <div
          key={`${item.date}-${index}`}
          className="flex flex-col items-center flex-1 z-10"
        >
          <div className="text-xs text-muted-foreground mb-2">
            {new Date(item.date).toLocaleDateString("fa-IR", {
              month: "short",
              day: "numeric",
            })}
          </div>

          <div className="flex items-end gap-1 w-full h-32 justify-center">
            <div
              className="bg-red-500 rounded-t transition-all duration-500 hover:bg-red-600 min-h-0.5 relative group"
              style={{
                height: `${Math.max((item.amount / maxValue) * 80, 2)}%`,
                width: "24px",
              }}
              title={`مصرف: ${item.amount.toLocaleString("fa-IR")} افغانی`}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.amount.toLocaleString("fa-IR")}
              </div>
            </div>
          </div>

          <div className="mt-1 text-xs text-center">
            <div className="text-red-600 font-medium">
              {item.amount > 0 ? item.amount.toLocaleString("fa-IR") : "0"}
            </div>
          </div>
        </div>
      ))}

      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
        <span>{maxValue.toLocaleString("fa-IR")}</span>
        <span>{(maxValue * 0.75).toLocaleString("fa-IR")}</span>
        <span>{(maxValue * 0.5).toLocaleString("fa-IR")}</span>
        <span>{(maxValue * 0.25).toLocaleString("fa-IR")}</span>
        <span>0</span>
      </div>
    </div>
  );
};
