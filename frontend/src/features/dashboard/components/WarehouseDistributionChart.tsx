/**
 * 倉庫別在庫 円グラフ
 *
 * Recharts PieChart を使用して倉庫別在庫分布を表示
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { PIE_CHART_COLORS } from "./chartColors";
import { ChartContainer } from "./ChartContainer";

import { useInventoryByWarehouse } from "@/hooks/api";

interface ChartData {
  id: number;
  name: string;
  value: number;
  [key: string]: string | number;
}

export function WarehouseDistributionChart() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useInventoryByWarehouse();

  const chartData = useMemo<ChartData[]>(() => {
    if (!data) return [];

    return data.map((item) => ({
      id: item.warehouse_id,
      name: item.warehouse_name || `倉庫${item.warehouse_id}`,
      value: Number(item.total_quantity ?? 0),
    }));
  }, [data]);

  const totalQuantity = chartData.reduce((sum, item) => sum + item.value, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePieClick = (data: any) => {
    // Recharts Pie onClick passes the data object directly (or via payload)
    // data might be the entry object
    if (data && data.id) {
        navigate(`/inventory?warehouse_id=${data.id}`);
    } else if (data && data.payload && data.payload.id) {
         navigate(`/inventory?warehouse_id=${data.payload.id}`);
    }
  };

  return (
    <ChartContainer
      title="倉庫別在庫分布"
      description={`総在庫: ${totalQuantity.toLocaleString("ja-JP")}`}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
    >
      <ResponsiveContainer width="100%" height={280} className="cursor-pointer">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={2}
            label={({ name, percent }) =>
              (percent ?? 0) > 0.05 ? `${name} (${((percent ?? 0) * 100).toFixed(0)}%)` : ""
            }
            labelLine={false}
            onClick={handlePieClick}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
            formatter={(value: number) => [value.toLocaleString("ja-JP"), "在庫数"]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
