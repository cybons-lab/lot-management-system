/**
 * 製品別在庫Top10 棒グラフ
 *
 * Recharts BarChart を使用して製品別在庫を表示
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { CHART_COLORS } from "./chartColors";
import { ChartContainer } from "./ChartContainer";

import { useInventoryByProduct } from "@/hooks/api";

interface ChartData {
  id: number;
  name: string;
  quantity: number;
  code: string;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  fontSize: "12px",
} as const;

const formatTooltipValue = (value: number | string | Array<number | string>) =>
  [value?.toLocaleString("ja-JP") ?? "0", "在庫数"] as const;

export function TopProductsChart() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useInventoryByProduct();

  const chartData = useMemo<ChartData[]>(() => {
    if (!data) return [];

    // 在庫数量でソートしてTop10を取得
    const sorted = [...data]
      .sort((a, b) => Number(b.total_quantity ?? 0) - Number(a.total_quantity ?? 0))
      .slice(0, 10);

    return sorted.map((item) => ({
      id: item.product_group_id,
      name: item.product_name || `製品${item.product_group_id}`,
      quantity: Number(item.total_quantity ?? 0),
      code: item.product_code || "",
    }));
  }, [data]);

  const handleBarClick = (data: { activePayload?: Array<{ payload: ChartData }> }) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      navigate(`/inventory?product_group_id=${payload.id}`);
    }
  };

  return (
    <ChartContainer
      title="製品別在庫 Top10"
      description="在庫数量の多い製品上位10件"
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
    >
      <div className="h-[280px] w-full">
        <ResponsiveContainer
          width="100%"
          height={280}
          minWidth={0}
          minHeight={0}
          className="cursor-pointer"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onClick={handleBarClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
              tickFormatter={(value) => value.toLocaleString("ja-JP")}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10 }}
              stroke="#6b7280"
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatTooltipValue} />
            <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index < 3 ? CHART_COLORS.primary : CHART_COLORS.info}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
