import { WarehouseDetailDialog } from "./WarehouseDetailDialog";
import { WarehouseForm } from "./WarehouseForm";

import { MasterBulkDialog } from "@/shared/components/layout/MasterBulkDialog";
import { MasterDialogContainer } from "@/shared/components/layout/MasterDialogContainer";

interface WarehouseDialogContainerProps {
  p: any;
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
          onSubmit={p.handleCreate}
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
              (d: any) => p.softDel.mutateAsync({ ...d, endDate: e || undefined }),
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
