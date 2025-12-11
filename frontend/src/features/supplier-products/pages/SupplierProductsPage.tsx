/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/**
 * SupplierProductsPage - 仕入先商品詳細・一覧
 */
import { Package, Plus, Upload } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

import {
  type SupplierProduct,
  type SupplierProductCreate,
  type SupplierProductUpdate,
} from "../api";
import { SupplierProductExportButton } from "../components/SupplierProductExportButton";
import { SupplierProductForm } from "../components/SupplierProductForm";
import {
  SupplierProductsTable,
  type SupplierProductWithValidTo,
} from "../components/SupplierProductsTable";
import { useSupplierProducts } from "../hooks/useSupplierProducts";

import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";
import { Button, Input, Checkbox } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/display/alert-dialog";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import type { SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SupplierProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "supplier_id",
    direction: "asc",
  });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [editingItem, setEditingItem] = useState<SupplierProductWithValidTo | null>(null);

  // Delete & Restore state
  const [deletingItem, setDeletingItem] = useState<SupplierProductWithValidTo | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");
  const [restoringItem, setRestoringItem] = useState<SupplierProductWithValidTo | null>(null);

  const { useList, useCreate, useUpdate, useSoftDelete, usePermanentDelete, useRestore } =
    useSupplierProducts();
  const { data: supplierProducts = [], isLoading, isError, error, refetch } = useList(showInactive);

  const { useList: useProductList } = useProducts();
  const { data: products = [] } = useProductList(true);

  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList(true);

  const { mutate: create, isPending: isCreating } = useCreate();
  const { mutate: update, isPending: isUpdating } = useUpdate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

  // Maps for efficient lookups (used for filtering and sorting)
  const productMap = useMemo(() => {
    return new Map(
      products.map((p) => [p.id, { code: p.maker_item_code || "", name: p.product_name }]),
    );
  }, [products]);

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.id, { code: s.supplier_code, name: s.supplier_name }]));
  }, [suppliers]);

  const handleEditClick = (row: SupplierProductWithValidTo) => {
    setEditingItem(row);
  };

  const handleDeleteClick = (row: SupplierProductWithValidTo) => {
    setDeletingItem(row);
    setDeleteMode("soft");
  };

  const handlePermanentClick = (row: SupplierProductWithValidTo) => {
    setDeletingItem(row);
    setDeleteMode("permanent");
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return supplierProducts;
    const query = searchQuery.toLowerCase();
    return supplierProducts.filter((sp) => {
      // Use API-returned data first, fallback to maps
      const p = productMap.get(sp.product_id);
      const s = supplierMap.get(sp.supplier_id);
      const targetString = `
        ${sp.product_code || ""} ${sp.product_name || ""} 
        ${sp.supplier_code || ""} ${sp.supplier_name || ""}
        ${p?.code || ""} ${p?.name || ""}
        ${s?.code || ""} ${s?.name || ""}
      `.toLowerCase();
      return targetString.includes(query);
    });
  }, [supplierProducts, searchQuery, productMap, supplierMap]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      // Helper to get sortable value
      const getVal = (item: SupplierProduct, col: string) => {
        if (col === "product_id") {
          return item.product_code || productMap.get(item.product_id)?.code || "";
        }
        if (col === "supplier_id") {
          return item.supplier_code || supplierMap.get(item.supplier_id)?.code || "";
        }
        return item[col as keyof SupplierProduct];
      };

      const aVal = getVal(a, sort.column);
      const bVal = getVal(b, sort.column);

      if (aVal == null || bVal == null) return 0;
      if (aVal === bVal) return 0;

      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sort, productMap, supplierMap]);

  const handleCreate = useCallback(
    (data: SupplierProductCreate | SupplierProductUpdate) => {
      // Cast to Create type since form returns union
      create(data as SupplierProductCreate, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [create],
  );

  const handleUpdate = useCallback(
    (data: SupplierProductCreate | SupplierProductUpdate) => {
      if (!editingItem) return;
      // Cast to Update type
      update(
        { id: editingItem.id, data: data as SupplierProductUpdate },
        { onSuccess: () => setEditingItem(null) },
      );
    },
    [editingItem, update],
  );

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDelete(
      { id: deletingItem.id, endDate: endDate || undefined },
      {
        onSuccess: () => setDeletingItem(null),
      },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(deletingItem.id, {
      onSuccess: () => setDeletingItem(null),
    });
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.id, {
      onSuccess: () => setRestoringItem(null),
    });
  };

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader title="仕入先商品" subtitle="仕入先別の製品情報を管理します" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="仕入先商品"
        subtitle="仕入先別の製品情報を管理します"
        actions={
          <div className="flex gap-2">
            <SupplierProductExportButton size="sm" />
            <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              インポート
            </Button>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-orange-50 p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-orange-600">登録件数</p>
              <p className="text-2xl font-bold text-orange-700">{supplierProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">仕入先商品一覧</h3>
          <div className="flex items-center space-x-4">
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
            <Input
              type="search"
              placeholder="製品・仕入先で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
        <SupplierProductsTable
          products={products}
          suppliers={suppliers}
          supplierProducts={sortedData}
          isLoading={isLoading}
          sort={sort}
          onSortChange={setSort}
          onEdit={handleEditClick}
          onSoftDelete={handleDeleteClick}
          onPermanentDelete={handlePermanentClick}
          onRestore={(row) => setRestoringItem(row)}
        />
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>仕入先商品登録</DialogTitle>
          </DialogHeader>
          <SupplierProductForm
            products={products}
            suppliers={suppliers}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>仕入先商品編集</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <SupplierProductForm
              initialData={editingItem}
              products={products}
              suppliers={suppliers}
              onSubmit={handleUpdate}
              onCancel={() => setEditingItem(null)}
              isSubmitting={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="仕入先商品設定を無効化しますか？"
        description={`${deletingItem?.product_name || "製品"} - ${deletingItem?.supplier_name || "仕入先"} の関連を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
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
        isPending={isPermanentDeleting}
        title="仕入先商品設定を完全に削除しますか？"
        description={`${deletingItem?.product_name || "製品"} - ${deletingItem?.supplier_name || "仕入先"} の関連を完全に削除します。`}
        confirmationPhrase={deletingItem?.product_code || "delete"}
      />

      <AlertDialog
        open={!!restoringItem}
        onOpenChange={(open: boolean) => !open && setRestoringItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>設定を復元しますか？</DialogTitle>
            <AlertDialogDescription>
              {restoringItem?.product_name} - {restoringItem?.supplier_name}{" "}
              の関連を有効状態に戻します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? "復元中..." : "復元"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MasterImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="仕入先商品 インポート"
        group="supply"
      />
    </div>
  );
}
