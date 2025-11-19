// app/dashboard/admin/components/ExpenseCategoryChart.tsx
"use client";

interface ExpenseCategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface ExpenseCategoryChartProps {
  data: ExpenseCategoryData[];
}

export const ExpenseCategoryChart = ({ data }: ExpenseCategoryChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <div className="text-center">
          <p className="font-medium">اطلاعات موجود نیست</p>
          <p className="text-sm">هیچ مصرفی در بازه انتخاب شده یافت نشد</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fa-IR") + " افغانی";
  };

  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  // Calculate cumulative percentages for custom pie chart
  let cumulativePercentage = 0;
  const chartData = data.map((item, index) => {
    const percentage = (item.amount / totalAmount) * 100;
    const startAngle = cumulativePercentage * 3.6; // Convert to degrees
    cumulativePercentage += percentage;
    const endAngle = cumulativePercentage * 3.6;

    return {
      ...item,
      color: colors[index % colors.length],
      percentage,
      startAngle,
      endAngle,
      midAngle: (startAngle + endAngle) / 2,
    };
  });

  // Calculate label positions
  const radius = 60;
  const centerX = 70;
  const centerY = 70;

  return (
    <div className="w-full h-64 flex flex-col items-center">
      {/* Custom Pie Chart */}
      <div className="relative mb-4">
        <svg width="140" height="140" className="transform -rotate-90">
          {chartData.map((item, index) => {
            const startAngle = (item.startAngle * Math.PI) / 180;
            const endAngle = (item.endAngle * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArcFlag = item.percentage > 50 ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              "Z",
            ].join(" ");

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="white"
                strokeWidth="1"
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold">
              {totalAmount.toLocaleString("fa-IR")}
            </div>
            <div className="text-xs text-muted-foreground">مجموع</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full max-h-32 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{item.category}</div>
                <div className="text-muted-foreground">
                  {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
