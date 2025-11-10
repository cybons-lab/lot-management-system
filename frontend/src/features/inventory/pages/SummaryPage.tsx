/**
 * SummaryPage.tsx
 *
 * 在庫サマリページ
 * - 在庫の統計情報を表示
 * - 総ロット数、有効ロット数、総在庫数など
 */

import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useLotsQuery } from "@/hooks/api";
import { Section } from "@/shared/components/layout";
import { fmt } from "@/shared/utils/number";

// ============================================
// メインコンポーネント
// ============================================

export function SummaryPage() {
  // データ取得
  const { data: allLots = [], isLoading, error, refetch } = useLotsQuery({});

  // 統計情報の計算
  const stats = useMemo(() => {
    const totalLots = allLots.length;
    const activeLots = allLots.filter((lot) => lot.current_quantity > 0).length;
    const totalQuantity = allLots.reduce((sum, lot) => sum + lot.current_quantity, 0);
    const uniqueProducts = new Set(allLots.map((lot) => lot.product_code)).size;
    const uniqueWarehouses = new Set(allLots.map((lot) => lot.warehouse_code)).size;

    return {
      totalLots,
      activeLots,
      totalQuantity,
      uniqueProducts,
      uniqueWarehouses,
    };
  }, [allLots]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Section>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-800">データの取得に失敗しました</p>
          <p className="mt-2 text-xs text-red-600">
            {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            再試行
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 総ロット数 */}
        <StatCard
          title="総ロット数"
          value={fmt(stats.totalLots)}
          description="登録されているロットの総数"
        />

        {/* 有効ロット数 */}
        <StatCard
          title="有効ロット数"
          value={fmt(stats.activeLots)}
          description="在庫が残っているロット"
          highlight
        />

        {/* 総在庫数 */}
        <StatCard
          title="総在庫数"
          value={fmt(stats.totalQuantity)}
          description="すべてのロットの合計在庫"
        />

        {/* ユニーク製品数 */}
        <StatCard
          title="製品種類数"
          value={fmt(stats.uniqueProducts)}
          description="登録されている製品の種類"
        />

        {/* ユニーク倉庫数 */}
        <StatCard
          title="倉庫数"
          value={fmt(stats.uniqueWarehouses)}
          description="在庫がある倉庫の数"
        />

        {/* 在庫利用率 */}
        <StatCard
          title="在庫利用率"
          value={
            stats.totalLots > 0
              ? `${Math.round((stats.activeLots / stats.totalLots) * 100)}%`
              : "0%"
          }
          description="有効ロット / 総ロット"
        />
      </div>

      {/* 更新ボタン */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          データを更新
        </Button>
      </div>
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  highlight?: boolean;
}

function StatCard({ title, value, description, highlight }: StatCardProps) {
  return (
    <div
      className={`group rounded-xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        highlight
          ? "border-t border-r border-b border-l-4 border-gray-200 border-l-blue-500"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className={`mt-3 text-3xl font-bold ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </div>
      {description && <div className="mt-2 text-xs text-gray-500">{description}</div>}
    </div>
  );
}
