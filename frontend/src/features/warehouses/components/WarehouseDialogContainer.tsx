import type { useWarehouseListPage } from "../hooks/useWarehouseListPage";

import { WarehouseDetailDialog } from "./WarehouseDetailDialog";
import { WarehouseForm } from "./WarehouseForm";

import { MasterBulkDialog } from "@/shared/components/layout/MasterBulkDialog";
import { MasterDialogContainer } from "@/shared/components/layout/MasterDialogContainer";

interface WarehouseDialogContainerProps {
  p: ReturnType<typeof useWarehouseListPage>;
}

/**
 * 共通コンポーネント MasterDialogContainer を使用してリファクタリングされた
 * 倉庫用ダイアログコンテナ
 */
export function WarehouseDialogContainer({ p }: WarehouseDialogContainerProps) {
  const { dlgs } = p;

  return (
    <MasterDialogContainer
      p={p}
      entityName="倉庫"
      importGroup="warehouse"
      createForm={
        <WarehouseForm
          onSubmit={(data) =>
            p.handleCreate({
              ...data,
              short_name: data.short_name ?? null,
              default_transport_lead_time_days: data.default_transport_lead_time_days ?? null,
            })
          }
          onCancel={dlgs.close}
          isSubmitting={p.create.isPending}
        />
      }
      bulkDialog={
        <MasterBulkDialog
          isAdmin={p.isAdmin}
          isOpen={p.isBulkOpen}
          onOpenChange={p.setIsBulkOpen}
          count={p.selectedIds.length}
          isPending={p.isBulkProcessing}
          entityName="倉庫"
          onConfirmPermanent={() => p.handleBulkAction(p.permDel.mutateAsync, "完全削除")}
          onConfirmSoft={(e) =>
            p.handleBulkAction(
              (d) => p.softDel.mutateAsync({ ...d, ...(e ? { endDate: e } : {}) }),
              "無効化",
            )
          }
        />
      }
      detailDialog={
        <WarehouseDetailDialog
          warehouseCode={p.selectedWarehouseCode}
          open={!!p.selectedWarehouseCode}
          onOpenChange={(o) => !o && p.setSelectedWarehouseCode(null)}
        />
      }
    />
  );
}
