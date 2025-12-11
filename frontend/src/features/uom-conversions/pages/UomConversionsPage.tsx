/* eslint-disable max-lines-per-function */
import { Plus, Upload, Filter, X } from "lucide-react";
import { useCallback, useState, useMemo } from "react";

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

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useProducts } from "@/features/products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

export function UomConversionsPage() {
  const { useList } = useUomConversions();
  const { data: conversions = [], isLoading } = useList();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");

  const { useList: useProductList } = useProducts();
  const { data: products = [] } = useProductList();

  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList();

  const createMutation = useCreateUomConversion();

  const inlineEdit = useInlineEdit();
  const { deleteTarget, setDeleteTarget, isDeleting, handleDelete } = useDeleteConversion();

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
        <div className="ml-auto text-sm text-slate-500">
          表示中: {filteredConversions.length} / {conversions.length} 件
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
        setDeleteTarget={setDeleteTarget}
      />

      <div className="text-sm text-slate-600">{filteredConversions.length} 件の単位換算</div>

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
        suppliers={suppliers}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
