import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { AlertsWidget } from "./AlertsWidget";
import { DashboardStats } from "./DashboardStats";
import { DateRangePicker } from "./DateRangePicker";
import { InventoryTrendChart } from "./InventoryTrendChart";
import { MasterChangeLogWidget } from "./MasterChangeLogWidget";
import * as styles from "./styles";
import { TopProductsChart } from "./TopProductsChart";
import { WarehouseDistributionChart } from "./WarehouseDistributionChart";

import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  return (
    <PageContainer>
      <PageHeader
        title="ダッシュボード"
        subtitle="システムの健全性とアクティビティを監視します"
        actions={
          <DateRangePicker
            {...(dateRange !== undefined ? { date: dateRange } : {})}
            onDateChange={setDateRange}
          />
        }
      />
      <div className={styles.container}>
        {/* KPI Cards */}
        <DashboardStats />

        {/* Charts Section - Row 1 */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Products Bar Chart */}
          <TopProductsChart />

          {/* Right: Warehouse Pie Chart */}
          <WarehouseDistributionChart />
        </div>

        {/* Charts Section - Row 2 */}
        <div className="mt-6">
          <InventoryTrendChart />
        </div>

        {/* Alerts & Logs Section */}
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
