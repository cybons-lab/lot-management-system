/**
 * LotStatsCards.tsx
 *
 * ロット統計情報を表示するカードコンポーネント
 */

import type { LotStats } from "../hooks/useLotStats";

import { StatCard } from "./StatCard";

interface LotStatsCardsProps {
  /** 統計情報 */
  stats: LotStats;
}

/**
 * ロット統計情報カード
 */
export function LotStatsCards({ stats }: LotStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <StatCard title="総ロット数" value={stats.totalLots.toString()} />
      <StatCard title="有効ロット数" value={stats.activeLots.toString()} highlight />
      <StatCard
        title="総在庫数"
        value={stats.totalQuantity.toLocaleString()}
        description="全ロット合計"
      />
    </div>
  );
}
