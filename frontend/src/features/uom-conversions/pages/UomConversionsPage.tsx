/* eslint-disable max-lines-per-function */
import { Plus, Upload, Filter, X } from "lucide-react";
import { useCallback, useState, useMemo } from "react";

import type { UomConversionCreate, UomConversionResponse } from "../api";
import { UomConversionBulkImportDialog } from "../components/UomConversionBulkImportDialog";
import { UomConversionCreateDialog } from "../components/UomConversionCreateDialog";
import { UomConversionExportButton } from "../components/UomConversionExportButton";
import { UomConversionsTable } from "../components/UomConversionsTable";
import { useCreateUomConversion, useInlineEdit, useUomConversions } from "../hooks";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";
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
  // Pass showInactive to useList (assuming generic hook accepts it)
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

  // Delete & Restore state
  const [deletingItem, setDeletingItem] = useState<UomConversionResponse | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");
  const [restoringItem, setRestoringItem] = useState<UomConversionResponse | null>(null);

  const handleCreate = useCallback(
    (data: UomConversionCreate) => {
      createMutation.mutate(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createMutation],
  );

  // 製品IDから仕入先IDリストへのマップを作成
  const productSupplierMap = useMemo(() => {
    const map = new Map<number, number[]>();
    products.forEach((p) => {
      // API definition says supplier_ids is list[int] = []
      map.set(p.id, p.supplier_ids || []);
    });
    return map;
  }, [products]);

  // 仕入先フィルタリング
  const filteredConversions = useMemo(() => {
    if (selectedSupplierId === "all") return conversions;
    const supplierId = Number(selectedSupplierId);

    return conversions.filter((c) => {
      // conversion contains product_id, check if that product has the selected supplier
      if (!c.product_id) return false;
      const suppliers = productSupplierMap.get(c.product_id);
      return suppliers?.includes(supplierId);
    });
  }, [conversions, selectedSupplierId, productSupplierMap]);

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDeleteMutation.mutate(
      { id: deletingItem.conversion_id, endDate: endDate || undefined },
      {
        onSuccess: () => setDeletingItem(null),
      },
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

      <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">仕入先で絞り込み:</span>
        </div>
        <div className="w-[300px]">
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="仕入先を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての仕入先</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.supplier_code} - {s.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSupplierId !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSupplierId("all")}
            className="h-8 px-2 text-slate-500"
          >
            <X className="mr-1 h-3 w-3" />
            解除
          </Button>
        )}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) => setShowInactive(checked as boolean)}
            />
            <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
              削除済みを表示
            </Label>
          </div>
          <div className="text-sm text-slate-500">
            表示中: {filteredConversions.length} / {conversions.length} 件
          </div>
        </div>
      </div>

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
