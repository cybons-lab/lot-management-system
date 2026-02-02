import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { DemandForecastChart } from "@/features/demand/components/DemandForecastChart";
import { useDemandForecast } from "@/features/demand/hooks/useDemandForecast";

interface ForecastsTabProps {
  productId: number;
}

export function ForecastsTab({ productId }: ForecastsTabProps) {
  const { data: forecast, isLoading, error } = useDemandForecast({ supplier_item_id: productId });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>
          需要予測データの取得に失敗しました: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <DemandForecastChart forecast={forecast} isLoading={isLoading} />

      <div className="text-sm text-gray-500 rounded-md bg-slate-50 p-4 border border-slate-200">
        <h4 className="font-medium mb-1">予測モデルについて</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>平均予測: 過去30日の移動平均に季節係数を適用したモデルです。</li>
          <li>EWMA: 指数平滑移動平均 (α=0.3) を使用しています。</li>
          <li>※ 外れ値（特異な需要）は自動的に除外または補正されています。</li>
        </ul>
      </div>
    </div>
  );
}
