import { AlertsWidget } from "./AlertsWidget";
import { DashboardStats } from "./DashboardStats";
import { MasterChangeLogWidget } from "./MasterChangeLogWidget";
import * as styles from "./styles";

import { PageContainer } from "@/shared/components/layout/PageContainer";

export function Dashboard() {
  return (
    <PageContainer>
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
    </PageContainer>
  );
}
