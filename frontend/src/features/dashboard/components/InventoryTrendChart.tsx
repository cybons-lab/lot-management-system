/**
 * InventoryTrendChart - Line chart for inventory trends.
 * Shows mock data until backend API is implemented.
 */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "./chartColors";
import { ChartContainer } from "./ChartContainer";

// Mock data for inventory trends
const MOCK_DATA = [
  { date: "2023-01", total: 1200, allocated: 300, available: 900 },
  { date: "2023-02", total: 1350, allocated: 400, available: 950 },
  { date: "2023-03", total: 1100, allocated: 250, available: 850 },
  { date: "2023-04", total: 1400, allocated: 450, available: 950 },
  { date: "2023-05", total: 1550, allocated: 500, available: 1050 },
  { date: "2023-06", total: 1600, allocated: 550, available: 1050 },
];

export function InventoryTrendChart() {
  return (
    <ChartContainer title="在庫推移 (直近6ヶ月) (Mock)" subtitle="モックデータ表示中">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
          <LineChart
            data={MOCK_DATA}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              name="総在庫"
              stroke={CHART_COLORS.primary}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="available"
              name="有効在庫"
              stroke={CHART_COLORS.success}
            />
            <Line type="monotone" dataKey="allocated" name="引当済" stroke={CHART_COLORS.warning} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
