import { AlertsWidget } from "./AlertsWidget";
import { DashboardStats } from "./DashboardStats";
import { MasterChangeLogWidget } from "./MasterChangeLogWidget";
import * as styles from "./styles";

import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function Dashboard() {
  return (
    <PageContainer>
      <PageHeader title="ダッシュボード" subtitle="システムの健全性とアクティビティを監視します" />
      <div className={styles.container}>
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
