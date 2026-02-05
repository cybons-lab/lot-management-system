import { InventorySyncSection, BatchJobsList } from "../components";
import { useBatchJobsPage } from "../hooks";

import * as styles from "./BatchJobsPage.styles";

import { PageContainer, PageHeader } from "@/shared/components/layout";

export function BatchJobsPage() {
  const {
    statusFilter,
    setStatusFilter,
    showAllAlerts,
    setShowAllAlerts,
    alertsData,
    isLoadingAlerts,
    isAlertsError,
    executeSyncMutation,
    handleExecuteSync,
    response,
    isLoading,
    isError,
    executeMutation,
    deleteMutation,
    handleExecute,
    handleDelete,
  } = useBatchJobsPage();

  return (
    <PageContainer>
      <div className={styles.header.root}>
        <PageHeader
          title="バッチジョブ管理"
          subtitle="SAP在庫同期とバッチジョブの管理・実行"
          className="pb-0"
        />
      </div>

      {/* ===== SAP Inventory Sync Section ===== */}
      <InventorySyncSection
        onExecuteSync={handleExecuteSync}
        isExecuting={executeSyncMutation.isPending}
        showAllAlerts={showAllAlerts}
        onShowAllAlertsChange={setShowAllAlerts}
        isLoadingAlerts={isLoadingAlerts}
        isAlertsError={isAlertsError}
        alertsData={alertsData}
      />

      {/* ===== Batch Jobs Section ===== */}
      <BatchJobsList
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        isLoading={isLoading}
        isError={isError}
        response={response}
        onExecute={handleExecute}
        onDelete={handleDelete}
        isExecuting={executeMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
