type DashboardStats = {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
  allocation_rate: number;
};
import { useQuery } from "@tanstack/react-query";
import { Archive, Library, AlertCircle } from "lucide-react";

import * as styles from "./styles";

import { StatCard } from "@/components/ui";
import { api } from "@/services/api";

export function DashboardStats() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: api.getDashboardStats,
  });

  // ローディング中のスケルトン表示
  if (isLoading) {
    return (
      <div className={styles.grid}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // エラー表示
  if (isError || !stats) {
    console.error("[Dashboard] Stats fetch error:", error);
    return (
      <div className={styles.errorState.root + " text-center"}>
        統計データの読み込みに失敗しました。
        {import.meta.env.DEV && error && (
          <div className="mt-2 text-xs text-red-500">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      <StatCard
        title="総在庫数"
        value={stats.total_stock}
        icon={Archive}
        colorClass="border-blue-500"
      />
      <StatCard
        title="総受注数"
        value={stats.total_orders}
        icon={Library}
        colorClass="border-green-500"
      />
      <StatCard
        title="引当率"
        value={`${stats.allocation_rate}%`}
        icon={AlertCircle} // Using AlertCircle for now, maybe PieChart would be better but keeping icons consistent
        colorClass="border-purple-500"
      />
      <StatCard
        title="未引当受注"
        value={stats.unallocated_orders}
        icon={AlertCircle}
        colorClass="border-destructive"
      />
    </div>
  );
}

// スケルトンコンポーネント (ローディング中)
function StatCardSkeleton() {
  return (
    <div className={styles.skeleton.root}>
      <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div className={styles.skeleton.title}></div>
        <div className="bg-muted h-4 w-4 rounded"></div>
      </div>
      <div className="p-4 pt-0">
        <div className={styles.skeleton.value}></div>
      </div>
    </div>
  );
}
