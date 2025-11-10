type DashboardStats = { total_stock: number; total_orders: number; unallocated_orders: number };
import { useQuery } from "@tanstack/react-query";
import { Archive, Library, AlertCircle } from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // エラー表示
  if (isError || !stats) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-lg border p-4 text-center">
        統計データの読み込みに失敗しました。
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
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
    <div className="bg-card text-card-foreground rounded-lg border border-l-4 border-gray-300 shadow-sm">
      <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div className="bg-muted h-4 w-24 rounded"></div>
        <div className="bg-muted h-4 w-4 rounded"></div>
      </div>
      <div className="p-4 pt-0">
        <div className="bg-muted h-8 w-16 rounded"></div>
      </div>
    </div>
  );
}
