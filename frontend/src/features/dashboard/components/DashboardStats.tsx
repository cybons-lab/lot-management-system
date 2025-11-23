type DashboardStats = { total_stock: number; total_orders: number; unallocated_orders: number };
import { useQuery } from "@tanstack/react-query";
import { Archive, Library, AlertCircle } from "lucide-react";

import * as styles from "./styles";

import { StatCard } from "@/components/ui";
import { getStats } from "@/services/api";


export function DashboardStats() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getStats,
  });

  // ローディング中のスケルトン表示
  if (isLoading) {
    return (
      <div className={styles.grid}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // エラー表示
  if (isError || !stats) {
    return (
      <div className={styles.errorState.root + " text-center"}>
        統計データの読み込みに失敗しました。
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
