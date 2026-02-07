import type { useSupplierListPage } from "../hooks/useSupplierListPage";

import { SupplierDetailDialog } from "./SupplierDetailDialog";
import { SupplierForm } from "./SupplierForm";

import { MasterBulkDialog } from "@/shared/components/layout/MasterBulkDialog";
import { MasterDialogContainer } from "@/shared/components/layout/MasterDialogContainer";

interface SupplierDialogContainerProps {
  p: ReturnType<typeof useSupplierListPage>;
}

/**
 * 共通コンポーネント MasterDialogContainer を使用してリファクタリングされた
 * 仕入先用ダイアログコンテナ
 */
export function SupplierDialogContainer({ p }: SupplierDialogContainerProps) {
  const { dlgs } = p;

  return (
    <MasterDialogContainer
      p={p}
      entityName="仕入先"
      importGroup="supply"
      createForm={
        <SupplierForm
          onSubmit={(data) =>
            p.handleCreate({
              ...data,
              short_name: data.short_name ?? null,
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
          entityName="仕入先"
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
        <SupplierDetailDialog
          supplierCode={p.selectedSupplierCode}
          open={!!p.selectedSupplierCode}
          onOpenChange={(o) => !o && p.setSelectedSupplierCode(null)}
        />
      }
    />
  );
}
