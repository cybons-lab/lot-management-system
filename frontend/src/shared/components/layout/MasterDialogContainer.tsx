import { useCallback, type ReactNode } from "react";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import {
  MasterImportDialog,
  type TemplateGroup,
} from "@/features/masters/components/MasterImportDialog";

/** useMasterListPage系フックの戻り値のうち、MasterDialogContainerが使用する部分 */
export interface MasterPageHookResult {
  dlgs: {
    isCreateOpen: boolean;
    isEditOpen: boolean;
    isImportOpen: boolean;
    isSoftDeleteOpen: boolean;
    isPermanentDeleteOpen: boolean;
    isRestoreOpen: boolean;
    deletingItem: unknown;
    restoringItem: unknown;
    close: () => void;
    switchToPermanentDelete?: (() => void) | undefined;
  };
  log: (msg: string, context?: Record<string, unknown>) => void;
  handleSoftDelete: (endDate: string | null) => void;
  handlePermanentDelete: () => void;
  handleRestore: () => void;
  softDel?: { isPending: boolean } | undefined;
  permDel?: { isPending: boolean } | undefined;
  rest?: { isPending: boolean } | undefined;
}

interface MasterDialogContainerProps {
  p: MasterPageHookResult;
  entityName: string;
  importGroup: TemplateGroup;
  createForm: ReactNode;
  editForm?: ReactNode | undefined;
  bulkDialog: ReactNode;
  detailDialog?: ReactNode | undefined;
}

// Helper to safely extract name from unknown item
const getItemName = (item: unknown): string => {
  if (!item || typeof item !== "object") return "";
  const r = item as Record<string, unknown>;
  return (r.name as string) || (r.supplier_name as string) || (r.warehouse_name as string) || "";
};

// Helper to safely extract code from unknown item
const getItemCode = (item: unknown): string => {
  if (!item || typeof item !== "object") return "";
  const r = item as Record<string, unknown>;
  return (
    (r.code as string) ||
    (r.supplier_code as string) ||
    (r.warehouse_code as string) ||
    String(r.id || "")
  );
};

/**
 * マスタ画面の標準的なダイアログ群を集約して管理するコンポーネント
 */
// eslint-disable-next-line max-lines-per-function, complexity -- マスタ画面のダイアログ群を集約管理するため
export function MasterDialogContainer({
  p,
  entityName,
  importGroup,
  createForm,
  editForm,
  bulkDialog,
  detailDialog,
}: MasterDialogContainerProps) {
  const { dlgs, log } = p;

  const handleClose = useCallback(() => {
    log("Dialog closed");
    dlgs.close();
  }, [dlgs, log]);

  return (
    <>
      {/* 新規登録ダイアログ */}
      <Dialog open={dlgs.isCreateOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{entityName}新規登録</DialogTitle>
          </DialogHeader>
          {createForm}
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ（オプション） */}
      {editForm && (
        <Dialog open={dlgs.isEditOpen} onOpenChange={(o) => !o && handleClose()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{entityName}編集</DialogTitle>
            </DialogHeader>
            {editForm}
          </DialogContent>
        </Dialog>
      )}

      {/* インポートダイアログ */}
      <MasterImportDialog
        open={dlgs.isImportOpen}
        onOpenChange={(o) => !o && handleClose()}
        title={`${entityName}マスタ インポート`}
        group={importGroup}
      />

      {/* ソフト削除（無効化）ダイアログ */}
      <SoftDeleteDialog
        open={dlgs.isSoftDeleteOpen}
        onOpenChange={(o) => !o && handleClose()}
        title={`${entityName}を無効化しますか？`}
        description={dlgs.deletingItem ? `${getItemName(dlgs.deletingItem)} を無効化します。` : ""}
        onConfirm={p.handleSoftDelete}
        isPending={p.softDel?.isPending ?? false}
        {...(dlgs.switchToPermanentDelete
          ? { onSwitchToPermanent: dlgs.switchToPermanentDelete }
          : {})}
      />

      {/* 完全削除ダイアログ */}
      <PermanentDeleteDialog
        open={dlgs.isPermanentDeleteOpen}
        onOpenChange={(o) => !o && handleClose()}
        onConfirm={p.handlePermanentDelete}
        isPending={p.permDel?.isPending ?? false}
        title={`${entityName}を完全に削除しますか？`}
        description={
          dlgs.deletingItem ? `${getItemName(dlgs.deletingItem)} を完全に削除します。` : ""
        }
        confirmationPhrase={dlgs.deletingItem ? getItemCode(dlgs.deletingItem) : "delete"}
      />

      {/* 復元ダイアログ */}
      <RestoreDialog
        open={dlgs.isRestoreOpen}
        onOpenChange={(o) => !o && handleClose()}
        onConfirm={p.handleRestore}
        isPending={p.rest?.isPending ?? false}
        title={`${entityName}を復元しますか？`}
        description={
          dlgs.restoringItem ? `${getItemName(dlgs.restoringItem)} を有効状態に戻します。` : ""
        }
      />

      {/* 一括操作ダイアログ */}
      {bulkDialog}

      {/* 詳細ダイアログ（オプション） */}
      {detailDialog}
    </>
  );
}
