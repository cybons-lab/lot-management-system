import type { InventorySyncAlertsResponse } from "../api";

import { useInventorySyncAlertColumns } from "./BatchJobColumns";

import { Button } from "@/components/ui";
import { DataTable } from "@/shared/components/data/DataTable";

interface InventorySyncSectionProps {
  onExecuteSync: () => Promise<void>;
  isExecuting: boolean;
  showAllAlerts: boolean;
  onShowAllAlertsChange: (show: boolean) => void;
  isLoadingAlerts: boolean;
  isAlertsError: boolean;
  alertsData: InventorySyncAlertsResponse | undefined;
}

const SyncSectionHeader = ({
  onExecuteSync,
  isExecuting,
}: {
  onExecuteSync: () => Promise<void>;
  isExecuting: boolean;
}) => (
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold text-blue-900">SAP在庫同期</h3>
      <p className="text-sm text-blue-700">SAP在庫とローカルDB在庫の差異をチェックします</p>
    </div>
    <Button onClick={onExecuteSync} disabled={isExecuting} variant="default">
      {isExecuting ? "チェック中..." : "SAP在庫チェック実行"}
    </Button>
  </div>
);

const AlertsTable = ({
  isLoading,
  isError,
  data,
}: {
  isLoading: boolean;
  isError: boolean;
  data: InventorySyncAlertsResponse | undefined;
}) => {
  const columns = useInventorySyncAlertColumns();
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-4 text-center text-gray-500">読み込み中...</div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
        アラートの取得に失敗しました
      </div>
    );
  }
  if (!data || data.total === 0) {
    return (
      <div className="rounded-lg border bg-white p-4 text-center text-green-600">
        ✓ 差異はありません
      </div>
    );
  }
  return (
    <DataTable
      data={data.alerts}
      columns={columns}
      getRowId={(row) => row.rule_id}
      emptyMessage="差異アラートがありません"
    />
  );
};

export function InventorySyncSection({
  onExecuteSync,
  isExecuting,
  showAllAlerts,
  onShowAllAlertsChange,
  isLoadingAlerts,
  isAlertsError,
  alertsData,
}: InventorySyncSectionProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
        <SyncSectionHeader onExecuteSync={onExecuteSync} isExecuting={isExecuting} />

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-900">差異アラート</h4>
            <label className="flex items-center gap-2 text-sm text-blue-700">
              <input
                type="checkbox"
                checked={showAllAlerts}
                onChange={(e) => onShowAllAlertsChange(e.target.checked)}
                className="rounded"
              />
              全履歴を表示
            </label>
          </div>

          <AlertsTable isLoading={isLoadingAlerts} isError={isAlertsError} data={alertsData} />
        </div>
      </div>
    </div>
  );
}
