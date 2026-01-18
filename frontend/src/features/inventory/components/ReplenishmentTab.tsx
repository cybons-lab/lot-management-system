import { AlertCircle, Calculator, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReplenishmentRecommendation } from "@/features/inventory/hooks/useReplenishmentRecommendation";
import { formatDecimal, parseDecimal } from "@/shared/utils/decimal";

interface ReplenishmentTabProps {
  productId: number;
  warehouseId: number;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function ReplenishmentTab({ productId, warehouseId }: ReplenishmentTabProps) {
  // 単一製品・倉庫での計算実行
  const {
    data: recommendations,
    isLoading,
    error,
  } = useReplenishmentRecommendation({
    warehouse_id: warehouseId,
    product_ids: [productId],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>発注提案を作成中...</CardTitle>
          <CardDescription>
            需要予測と現在の在庫状況から、最適な発注量を計算しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>計算エラー</AlertTitle>
        <AlertDescription>
          発注提案の計算に失敗しました: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  const rec = recommendations?.[0];

  if (!rec) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>提案なし</AlertTitle>
        <AlertDescription>
          この製品に対する発注提案はありませんでした（計算結果が空です）。
        </AlertDescription>
      </Alert>
    );
  }

  const isOrderNeeded = rec.recommended_order_qty > 0;

  return (
    <div className="space-y-6">
      {/* メイン提案カード */}
      <Card className={isOrderNeeded ? "border-blue-500 bg-blue-50/50" : "bg-gray-50/50"}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            発注推奨:{" "}
            <span className="text-2xl font-bold">
              {formatDecimal(parseDecimal(rec.recommended_order_qty))}
            </span>
          </CardTitle>
          <CardDescription>
            {isOrderNeeded
              ? `${rec.recommended_order_date} に発注することで、${rec.expected_arrival_date} の入荷を見込みます。`
              : "現在、追加の発注は不要です。"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 詳細グリッド */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 現在の状況 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">現在の在庫状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>手持在庫:</span>
              <span className={`font-mono ${rec.current_on_hand < 0 ? "text-red-600" : ""}`}>
                {formatDecimal(parseDecimal(rec.current_on_hand), 2, 2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>引当/予約済み:</span>
              <span className={`font-mono ${rec.current_reserved < 0 ? "text-red-600" : ""}`}>
                {formatDecimal(parseDecimal(rec.current_reserved), 2, 2)}
              </span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>利用可能在庫:</span>
              <span className={`font-mono ${rec.current_available < 0 ? "text-red-600" : ""}`}>
                {formatDecimal(parseDecimal(rec.current_available), 2, 2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>入荷予定 (発注残):</span>
              <span className={`font-mono ${rec.pending_inbound < 0 ? "text-red-600" : ""}`}>
                {formatDecimal(parseDecimal(rec.pending_inbound), 2, 2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 計算パラメータ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              計算パラメータ (ROPロジック)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span title="平均日次需要 x リードタイム + 安全在庫">発注点 (ROP):</span>
              <span className="font-mono font-bold">
                {formatDecimal(parseDecimal(rec.reorder_point))}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 pl-4 border-l-2 border-gray-100">
              <span>安全在庫:</span>
              <span className="font-mono">{formatDecimal(parseDecimal(rec.safety_stock))}</span>
            </div>
            <div className="flex justify-between text-gray-500 pl-4 border-l-2 border-gray-100">
              <span>平均日次需要:</span>
              <span className="font-mono">{formatDecimal(parseDecimal(rec.avg_daily_demand))}</span>
            </div>
            <div className="flex justify-between text-gray-500 pl-4 border-l-2 border-gray-100">
              <span>リードタイム:</span>
              <span className="font-mono">
                {rec.lead_time_days} 日 (σ={rec.lead_time_std.toFixed(1)})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 制約条件 */}
      {(rec.moq || rec.lot_size || rec.constraints_applied.length > 0) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>適用された制約</AlertTitle>
          <AlertDescription className="text-xs text-gray-600 mt-1">
            <ul className="list-disc pl-4 space-y-1">
              {rec.moq && <li>最小発注数量 (MOQ): {formatDecimal(parseDecimal(rec.moq))}</li>}
              {rec.lot_size && (
                <li>ロットサイズ (丸め): {formatDecimal(parseDecimal(rec.lot_size))}</li>
              )}
              {rec.constraints_applied.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 説明文 (Markdown) */}
      <div className="rounded-md bg-slate-50 p-4 border border-slate-200">
        <h4 className="font-medium mb-2 text-sm">計算根拠の詳細</h4>
        <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono">{rec.explanation}</pre>
      </div>
    </div>
  );
}
