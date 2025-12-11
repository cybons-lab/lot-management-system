/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { Plus, Upload } from "lucide-react";
import { useCallback, useState, useMemo } from "react";

import type { UomConversionCreate, UomConversionResponse } from "../api";
import { UomConversionBulkImportDialog } from "../components/UomConversionBulkImportDialog";
import { UomConversionCreateDialog } from "../components/UomConversionCreateDialog";
import { UomConversionExportButton } from "../components/UomConversionExportButton";
import { UomConversionsFilter } from "../components/UomConversionsFilter";
import { UomConversionsTable } from "../components/UomConversionsTable";
import { useCreateUomConversion, useInlineEdit, useUomConversions } from "../hooks";

import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";
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
import { useProducts } from "@/features/products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

export function UomConversionsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const { useList, useSoftDelete, usePermanentDelete, useRestore } = useUomConversions();
  const { data: conversions = [], isLoading } = useList(showInactive);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");

  const { useList: useProductList } = useProducts();
  const { data: products = [] } = useProductList();

  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList();

  const createMutation = useCreateUomConversion();
  const inlineEdit = useInlineEdit();

  const softDeleteMutation = useSoftDelete();
  const permanentDeleteMutation = usePermanentDelete();
  const restoreMutation = useRestore();

  const [deletingItem, setDeletingItem] = useState<UomConversionResponse | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");
  const [restoringItem, setRestoringItem] = useState<UomConversionResponse | null>(null);

  const handleCreate = useCallback(
    (data: UomConversionCreate) => {
      createMutation.mutate(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createMutation],
  );

  const productSupplierMap = useMemo(() => {
    const map = new Map<number, number[]>();
    products.forEach((p) => {
      map.set(p.id, p.supplier_ids || []);
    });
    return map;
  }, [products]);

  const filteredConversions = useMemo(() => {
    if (selectedSupplierId === "all") return conversions;
    const supplierId = Number(selectedSupplierId);

    return conversions.filter((c) => {
      if (!c.product_id) return false;
      const suppliers = productSupplierMap.get(c.product_id);
      return suppliers?.includes(supplierId);
    });
  }, [conversions, selectedSupplierId, productSupplierMap]);

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDeleteMutation.mutate(
      { id: deletingItem.conversion_id, endDate: endDate || undefined },
      { onSuccess: () => setDeletingItem(null) },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDeleteMutation.mutate(deletingItem.conversion_id, {
      onSuccess: () => setDeletingItem(null),
    });
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restoreMutation.mutate(restoringItem.conversion_id, {
      onSuccess: () => setRestoringItem(null),
    });
  };

  if (isLoading) return <div className="p-6">読み込み中...</div>;

  const productOptions = products.map((p) => ({
    id: p.id,
    product_name: p.product_name,
    product_code: p.product_code,
    supplier_ids: p.supplier_ids,
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

      <UomConversionsFilter
        suppliers={suppliers}
        selectedSupplierId={selectedSupplierId}
        onSelectedSupplierIdChange={setSelectedSupplierId}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        displayCount={filteredConversions.length}
        totalCount={conversions.length}
      />

      <UomConversionsTable
        conversions={filteredConversions}
        editingId={inlineEdit.editingId}
        editValue={inlineEdit.editValue}
        setEditValue={inlineEdit.setEditValue}
        isUpdating={inlineEdit.isUpdating}
        handleSaveEdit={inlineEdit.handleSaveEdit}
        handleCancelEdit={inlineEdit.handleCancelEdit}
        handleStartEdit={inlineEdit.handleStartEdit}
        handleSoftDelete={(c) => {
          setDeletingItem(c);
          setDeleteMode("soft");
        }}
        handlePermanentDelete={(c) => {
          setDeletingItem(c);
          setDeleteMode("permanent");
        }}
        handleRestore={setRestoringItem}
      />

      <div className="text-sm text-slate-600">{filteredConversions.length} 件の単位換算</div>

      <UomConversionBulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <UomConversionCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        products={productOptions}
        suppliers={suppliers}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="単位換算を無効化しますか？"
        description={`${deletingItem?.product_name} (${deletingItem?.external_unit}) の設定を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={softDeleteMutation.isPending}
        onSwitchToPermanent={() => setDeleteMode("permanent")}
      />

      <PermanentDeleteDialog
        open={!!deletingItem && deleteMode === "permanent"}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeletingItem(null);
            setDeleteMode("soft");
          }
        }}
        onConfirm={handlePermanentDelete}
        isPending={permanentDeleteMutation.isPending}
        title="単位換算を完全に削除しますか？"
        description={`${deletingItem?.product_name} (${deletingItem?.external_unit}) の設定を完全に削除します。`}
        confirmationPhrase={deletingItem?.external_unit || "delete"}
      />

      <AlertDialog
        open={!!restoringItem}
        onOpenChange={(open: boolean) => !open && setRestoringItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>設定を復元しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {restoringItem?.product_name} ({restoringItem?.external_unit})
              の設定を有効状態に戻します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? "復元中..." : "復元"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
