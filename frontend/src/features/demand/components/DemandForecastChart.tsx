import { useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DemandForecast } from "@/services/api/demand-service";

interface DemandForecastChartProps {
  forecast: DemandForecast | null | undefined;
  isLoading: boolean;
  title?: string;
}

interface ChartData {
  date: string;
  quantity: number;
}

function ForecastChartContent({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => {
            const d = new Date(value);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(value) => {
            return new Date(String(value)).toLocaleDateString("ja-JP");
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="quantity" stroke="#8884d8" name="予測数量" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DemandForecastChart({
  forecast,
  isLoading,
  title = "需要予測推移",
}: DemandForecastChartProps) {
  const data = useMemo(() => {
    if (!forecast) return [];
    return forecast.daily_forecasts.map((d) => ({
      date: d.date,
      quantity: d.quantity,
      lower: d.confidence_interval_lower,
      upper: d.confidence_interval_upper,
      // For Area range, sometimes we need [lower, upper] but Recharts handles Area simpler usually.
      // We can use composed chart to show area behind line.
    }));
  }, [forecast]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          データがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ForecastChartContent data={data} />
      </CardContent>
    </Card>
  );
}
