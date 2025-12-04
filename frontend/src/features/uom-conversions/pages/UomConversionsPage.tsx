import { Upload } from "lucide-react";
import { useState } from "react";

import { UomConversionBulkImportDialog } from "../components/UomConversionBulkImportDialog";
import { UomConversionExportButton } from "../components/UomConversionExportButton";
import { UomConversionsTable } from "../components/UomConversionsTable";
import { useDeleteConversion, useInlineEdit, useUomConversions } from "../hooks";

import { Button } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/display/alert-dialog";

export function UomConversionsPage() {
  const { useList } = useUomConversions();
  const { data: conversions = [], isLoading } = useList();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { editingId, editValue, setEditValue, isUpdating, handleStartEdit, handleCancelEdit, handleSaveEdit } =
    useInlineEdit();

  const { deleteTarget, setDeleteTarget, isDeleting, handleDelete } = useDeleteConversion();

  if (isLoading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">単位換算</h1>
          <p className="mt-1 text-sm text-slate-600">製品単位の換算情報を管理します</p>
        </div>
        <div className="flex gap-2">
          <UomConversionExportButton size="sm" />
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            インポート
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <UomConversionsTable
        conversions={conversions}
        editingId={editingId}
        editValue={editValue}
        setEditValue={setEditValue}
        isUpdating={isUpdating}
        handleSaveEdit={handleSaveEdit}
        handleCancelEdit={handleCancelEdit}
        handleStartEdit={handleStartEdit}
        setDeleteTarget={setDeleteTarget}
      />

      {/* 件数表示 */}
      <div className="text-sm text-slate-600">{conversions.length} 件の単位換算</div>

      <UomConversionBulkImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>単位換算を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              製品「{deleteTarget?.product_name}」（{deleteTarget?.product_code}）の 外部単位「
              {deleteTarget?.external_unit}」の換算情報を削除します。 この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
