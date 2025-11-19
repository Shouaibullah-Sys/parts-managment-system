// app/dashboard/admin/components/ProfitAnalysisChart.tsx
"use client";

interface ProfitAnalysisData {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  netProfit: number;
}

interface ProfitAnalysisChartProps {
  data: ProfitAnalysisData;
}

export const ProfitAnalysisChart = ({ data }: ProfitAnalysisChartProps) => {
  const { totalRevenue, totalExpenses, grossProfit, profitMargin, netProfit } =
    data;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fa-IR") + " افغانی";
  };

  const maxValue = Math.max(
    totalRevenue,
    totalExpenses,
    grossProfit,
    netProfit
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                مجموع درآمد
              </p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                مجموع مصارف
              </p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-950">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                سود ناخالص
              </p>
              <p
                className={`text-xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(grossProfit)}
              </p>
            </div>
            <div
              className={`p-2 rounded-full ${grossProfit >= 0 ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950"}`}
            >
              <div
                className={`w-4 h-4 ${grossProfit >= 0 ? "bg-green-600" : "bg-red-600"} rounded`}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                نرخ سود
              </p>
              <p
                className={`text-xl font-bold ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
              <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">تحلیل سود و زیان</h3>

        <div className="relative h-64">
          <div className="absolute inset-0 flex items-end justify-around">
            {/* Revenue Bar */}
            <div className="flex flex-col items-center">
              <div
                className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t"
                style={{
                  height: `${(totalRevenue / maxValue) * 200}px`,
                  width: "60px",
                }}
                title={`درآمد: ${formatCurrency(totalRevenue)}`}
              />
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">درآمد</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(totalRevenue)}
                </div>
              </div>
            </div>

            {/* Expenses Bar */}
            <div className="flex flex-col items-center">
              <div
                className="bg-red-500 hover:bg-red-600 transition-colors rounded-t"
                style={{
                  height: `${(totalExpenses / maxValue) * 200}px`,
                  width: "60px",
                }}
                title={`مصارف: ${formatCurrency(totalExpenses)}`}
              />
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">مصارف</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(totalExpenses)}
                </div>
              </div>
            </div>

            {/* Gross Profit Bar */}
            <div className="flex flex-col items-center">
              <div
                className={`${grossProfit >= 0 ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} transition-colors rounded-t`}
                style={{
                  height: `${(Math.abs(grossProfit) / maxValue) * 200}px`,
                  width: "60px",
                }}
                title={`سود ناخالص: ${formatCurrency(grossProfit)}`}
              />
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">سود ناخالص</div>
                <div
                  className={`text-xs ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(grossProfit)}
                </div>
              </div>
            </div>

            {/* Net Profit Bar */}
            <div className="flex flex-col items-center">
              <div
                className={`${netProfit >= 0 ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-600 hover:bg-red-700"} transition-colors rounded-t`}
                style={{
                  height: `${(Math.abs(netProfit) / maxValue) * 200}px`,
                  width: "60px",
                }}
                title={`سود خالص: ${formatCurrency(netProfit)}`}
              />
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">سود خالص</div>
                <div
                  className={`text-xs ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {formatCurrency(netProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground pb-8">
            <span>{maxValue.toLocaleString("fa-IR")}</span>
            <span>{(maxValue * 0.75).toLocaleString("fa-IR")}</span>
            <span>{(maxValue * 0.5).toLocaleString("fa-IR")}</span>
            <span>{(maxValue * 0.25).toLocaleString("fa-IR")}</span>
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Profit Analysis Details */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">جزئیات تحلیل سود</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">نرخ بازگشت سرمایه (ROI)</span>
              <span className="font-medium">
                {totalExpenses > 0
                  ? ((grossProfit / totalExpenses) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">نسبت هزینه به درآمد</span>
              <span className="font-medium">
                {totalRevenue > 0
                  ? ((totalExpenses / totalRevenue) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">سود به ازای هر افغانی درآمد</span>
              <span className="font-medium">
                {totalRevenue > 0 ? (grossProfit / totalRevenue).toFixed(3) : 0}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg ${profitMargin >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
            >
              <h4 className="font-medium mb-2">وضعیت سودآوری</h4>
              <p
                className={`text-sm ${profitMargin >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
              >
                {profitMargin >= 0
                  ? `سودآور با نرخ ${profitMargin.toFixed(1)}%`
                  : `زیان‌ده با نرخ ${Math.abs(profitMargin).toFixed(1)}%`}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950">
              <h4 className="font-medium mb-2">توصیه</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {profitMargin < 10
                  ? "نیاز به کاهش هزینه‌ها یا افزایش درآمد"
                  : profitMargin > 30
                    ? "عملکرد عالی، حفظ روند فعلی"
                    : "عملکرد مناسب، فرصت بهبود وجود دارد"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
