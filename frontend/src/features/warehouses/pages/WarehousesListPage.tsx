import { Warehouse as WarehouseIcon } from "lucide-react";
import { useMemo } from "react";

import { WarehouseDialogContainer } from "../components/WarehouseDialogContainer";
import { WarehouseTableSection } from "../components/WarehouseTableSection";
import { useWarehouseListPage } from "../hooks/useWarehouseListPage";

import { createWarehouseColumns } from "./columns";
import * as styles from "./styles";

import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";

/**
 * 倉庫マスタ一覧ページ
 */
export function WarehousesListPage() {
  const p = useWarehouseListPage();
  const { dlgs, setSelectedWarehouseCode } = p;
  const cols = useMemo(
    () =>
      createWarehouseColumns({
        onRestore: dlgs.openRestore,
        onPermanentDelete: dlgs.openPermanentDelete,
        onEdit: (r) => setSelectedWarehouseCode(r.warehouse_code),
        onSoftDelete: dlgs.openSoftDelete,
      }),
    [dlgs, setSelectedWarehouseCode],
  );

  const header = (
    <PageHeader
      title="倉庫マスタ"
      subtitle="倉庫の作成・編集・削除、一括インポート/エクスポート"
      backLink={{ to: "/masters", label: "マスタ管理" }}
      actions={
        <MasterPageActions
          exportApiPath="masters/warehouses/export/download"
          exportFilePrefix="warehouses"
          onImportClick={p.dlgs.openImport}
          onCreateClick={p.dlgs.openCreate}
        />
      }
    />
  );

  if (p.list.isError)
    return (
      <div className={styles.root}>
        {header}
        <QueryErrorFallback error={p.list.error} resetError={p.list.refetch} />
      </div>
    );

  return (
    <div className={styles.root}>
      {header}
      <div className={styles.statsGrid}>
        <div className={styles.statsCard({ variant: "blue" })}>
          <div className="flex items-center gap-3">
            <WarehouseIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録倉庫数</p>
              <p className={styles.statsValue({ color: "blue" })}>{p.list.data?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
      <WarehouseTableSection p={p} cols={cols} />
      <WarehouseDialogContainer p={p} />
    </div>
  );
}
