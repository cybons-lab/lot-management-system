import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { StatCard } from "@/components/ui/StatCard";
import { Archive, Library, AlertCircle } from "lucide-react";

export function DashboardStats() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getStats,
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
      <div className="rounded-lg border bg-destructive/10 p-4 text-center text-destructive">
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
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm border-l-4 border-gray-300">
      <div className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted rounded"></div>
        <div className="h-4 w-4 bg-muted rounded"></div>
      </div>
      <div className="p-4 pt-0">
        <div className="h-8 w-16 bg-muted rounded"></div>
      </div>
    </div>
  );
}
