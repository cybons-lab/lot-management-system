import { Plus, Upload } from "lucide-react";
import { useCallback, useState } from "react";

import type { UomConversionCreate } from "../api";
import { UomConversionBulkImportDialog } from "../components/UomConversionBulkImportDialog";
import { UomConversionCreateDialog } from "../components/UomConversionCreateDialog";
import { UomConversionDeleteDialog } from "../components/UomConversionDeleteDialog";
import { UomConversionExportButton } from "../components/UomConversionExportButton";
import { UomConversionsTable } from "../components/UomConversionsTable";
import {
  useCreateUomConversion,
  useDeleteConversion,
  useInlineEdit,
  useUomConversions,
} from "../hooks";

import { Button } from "@/components/ui";
import { useProducts } from "@/features/products/hooks";

export function UomConversionsPage() {
  const { useList } = useUomConversions();
  const { data: conversions = [], isLoading } = useList();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { useList: useProductList } = useProducts();
  const { data: products = [] } = useProductList();
  const createMutation = useCreateUomConversion();

  const inlineEdit = useInlineEdit();
  const { deleteTarget, setDeleteTarget, isDeleting, handleDelete } = useDeleteConversion();

  const handleCreate = useCallback(
    (data: UomConversionCreate) => {
      createMutation.mutate(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createMutation],
  );

  if (isLoading) return <div className="p-6">読み込み中...</div>;

  const productOptions = products.map((p) => ({
    id: p.id,
    product_name: p.product_name,
    product_code: p.product_code,
  }));

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
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
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        </div>
      </div>

      <UomConversionsTable
        conversions={conversions}
        editingId={inlineEdit.editingId}
        editValue={inlineEdit.editValue}
        setEditValue={inlineEdit.setEditValue}
        isUpdating={inlineEdit.isUpdating}
        handleSaveEdit={inlineEdit.handleSaveEdit}
        handleCancelEdit={inlineEdit.handleCancelEdit}
        handleStartEdit={inlineEdit.handleStartEdit}
        setDeleteTarget={setDeleteTarget}
      />

      <div className="text-sm text-slate-600">{conversions.length} 件の単位換算</div>

      <UomConversionBulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
      <UomConversionDeleteDialog
        target={deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
      <UomConversionCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        products={productOptions}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
