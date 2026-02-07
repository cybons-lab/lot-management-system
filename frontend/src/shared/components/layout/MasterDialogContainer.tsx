import { useCallback, type ReactNode } from "react";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import {
  MasterImportDialog,
  type TemplateGroup,
} from "@/features/masters/components/MasterImportDialog";

interface MasterDialogContainerProps {
  // 共通状態フックの戻り値 (p)
  // 柔軟性のため any を許容（各マスタフックの戻り値を型定義するのは複雑すぎるため）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any;
  // 固有の表示名・設定
  entityName: string;
  importGroup: TemplateGroup;
  // 各種フォーム・ダイアログのスロット
  createForm: ReactNode;
  editForm?: ReactNode;
  bulkDialog: ReactNode;
  detailDialog?: ReactNode;
}

/**
 * マスタ画面の標準的なダイアログ群を集約して管理するコンポーネント
 */
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
    log("Dialog closed", { activeType: dlgs.type });
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
        description={
          dlgs.deletingItem
            ? `${(dlgs.deletingItem as any).name || (dlgs.deletingItem as any).supplier_name || (dlgs.deletingItem as any).warehouse_name} を無効化します。`
            : ""
        }
        onConfirm={p.handleSoftDelete}
        isPending={p.softDel?.isPending}
        onSwitchToPermanent={dlgs.switchToPermanentDelete}
      />

      {/* 完全削除ダイアログ */}
      <PermanentDeleteDialog
        open={dlgs.isPermanentDeleteOpen}
        onOpenChange={(o) => !o && handleClose()}
        onConfirm={p.handlePermanentDelete}
        isPending={p.permDel?.isPending}
        title={`${entityName}を完全に削除しますか？`}
        description={
          dlgs.deletingItem
            ? `${(dlgs.deletingItem as any).name || (dlgs.deletingItem as any).supplier_name || (dlgs.deletingItem as any).warehouse_name} を完全に削除します。`
            : ""
        }
        confirmationPhrase={
          dlgs.deletingItem
            ? String(
                (dlgs.deletingItem as any).code ||
                  (dlgs.deletingItem as any).supplier_code ||
                  (dlgs.deletingItem as any).warehouse_code,
              )
            : "delete"
        }
      />

      {/* 復元ダイアログ */}
      <RestoreDialog
        open={dlgs.isRestoreOpen}
        onOpenChange={(o) => !o && handleClose()}
        onConfirm={p.handleRestore}
        isPending={p.rest?.isPending}
        title={`${entityName}を復元しますか？`}
        description={
          dlgs.restoringItem
            ? `${(dlgs.restoringItem as any).name || (dlgs.restoringItem as any).supplier_name || (dlgs.restoringItem as any).warehouse_name} を有効状態に戻します。`
            : ""
        }
      />

      {/* 一括操作ダイアログ */}
      {bulkDialog}

      {/* 詳細ダイアログ（オプション） */}
      {detailDialog}
    </>
  );
}
