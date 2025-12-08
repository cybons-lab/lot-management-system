import { AlertsWidget } from "./AlertsWidget";
import { DashboardStats } from "./DashboardStats";
import { MasterChangeLogWidget } from "./MasterChangeLogWidget";
import * as styles from "./styles";

export function Dashboard() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6 pb-20">
      <div className={styles.container}>
        <div className={styles.header.root}>
          <h2 className={styles.header.title}>ダッシュボード</h2>
          <p className={styles.header.description}>システムの健全性とアクティビティを監視します</p>
        </div>

        {/* KPI Cards */}
        <DashboardStats />

        {/* Main Content Grid */}
        <div className="mt-6 grid min-h-[400px] grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Alerts */}
          <AlertsWidget />

          {/* Right: Master Change Logs */}
          <MasterChangeLogWidget />
        </div>
      </div>
    </div>
  );
}
