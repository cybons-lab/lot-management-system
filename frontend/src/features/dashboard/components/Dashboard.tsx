import {} from // Archive, // Removed: Not used
// Library, // Removed: Not used
// AlertCircle, // Removed: Not used
"lucide-react";

// ============================================
// 型定義
// ============================================

export interface DashboardStatsData {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
  allocation_rate: number;
}

interface DashboardProps {
  stats?: DashboardStatsData;
  isLoading: boolean;
  isError: boolean;
}

import * as styles from "./styles";

// ============================================
// メインコンポーネント
// ============================================

export function Dashboard({ stats, isLoading, isError }: DashboardProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header.root}>
          <h2 className={styles.header.title}>ダッシュボード</h2>
          <p className={styles.header.description}>システムの概要と重要な指標を確認できます</p>
        </div>
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.header.root}>
          <h2 className={styles.header.title}>ダッシュボード</h2>
          <p className={styles.header.description}>システムの概要と重要な指標を確認できます</p>
        </div>
        <div className={styles.errorState.root}>
          <p className={styles.errorState.text}>統計データの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  // データがない場合は0を表示
  const totalStock = stats?.total_stock ?? 0;
  const totalOrders = stats?.total_orders ?? 0;
  const unallocatedOrders = stats?.unallocated_orders ?? 0;
  const allocationRate = stats?.allocation_rate ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className={styles.container}>
        <div className={styles.header.root}>
          <h2 className={styles.header.title}>ダッシュボード</h2>
          <p className={styles.header.description}>システムの概要と重要な指標を確認できます</p>
        </div>

        {/* KPIカード */}
        <div className={styles.grid}>
          <StatCard
            title="総在庫数"
            value={Number(totalStock) || 0}
            colorClass="border-blue-500"
            description="現在の総在庫量"
          />
          <StatCard
            title="総受注数"
            value={Number(totalOrders) || 0}
            colorClass="border-green-500"
            description="登録された受注の総数"
          />
          <StatCard
            title="未引当受注"
            value={Number(unallocatedOrders) || 0}
            colorClass="border-amber-500"
            description="引当が必要な受注件数"
          />
          <StatCard
            title="引当率"
            value={`${allocationRate.toFixed(1)}%`}
            colorClass="border-purple-500"
            description="引当済受注の割合"
          />
        </div>

        <div className={styles.activity.root}>
          <h3 className={styles.activity.title}>最近の活動</h3>
          <p className={styles.activity.text}>アクティビティログは準備中です...</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

interface StatCardProps {
  title: string;
  value: number | string;
  colorClass: string;
  description?: string;
}

function StatCard({ title, value, colorClass, description }: StatCardProps) {
  // Map colorClass to cva variant
  const colorMap: Record<string, "blue" | "green" | "amber" | "gray" | "purple"> = {
    "border-blue-500": "blue",
    "border-green-500": "green",
    "border-amber-500": "amber",
    "border-purple-500": "purple",
  };
  const color = colorMap[colorClass] || "gray";

  const displayValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className={styles.statCard.root({ color })}>
      <div className={styles.statCard.content}>
        <h3 className={styles.statCard.title}>{title}</h3>
        <p className={styles.statCard.value}>{displayValue}</p>
        {description && <p className={styles.statCard.description}>{description}</p>}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className={styles.skeleton.root}>
      <div className={styles.skeleton.content}>
        <div className={styles.skeleton.title}></div>
        <div className={styles.skeleton.value}></div>
      </div>
    </div>
  );
}
