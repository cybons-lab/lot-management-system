/**
 * SupplierProductsPage - 仕入先商品詳細・一覧
 */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { Package, Plus, Pencil, Trash2, Upload, RotateCcw } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

import {
  type SupplierProduct,
  type SupplierProductCreate,
  type SupplierProductUpdate,
} from "../api";
import { SupplierProductExportButton } from "../components/SupplierProductExportButton";
import { SupplierProductForm } from "../components/SupplierProductForm";
import { useSupplierProducts } from "../hooks/useSupplierProducts";

import { Button, Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import type { Column, SortConfig } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

// Extend SupplierProduct type locally if needed
type SupplierProductWithValidTo = SupplierProduct & { valid_to?: string };

function createColumns(
  productMap: Map<number, { code: string; name: string }>,
  supplierMap: Map<number, { code: string; name: string }>,
  onRestore: (row: SupplierProductWithValidTo) => void,
  onPermanentDelete: (row: SupplierProductWithValidTo) => void,
  onEdit: (row: SupplierProductWithValidTo) => void,
  onSoftDelete: (row: SupplierProductWithValidTo) => void,
): Column<SupplierProductWithValidTo>[] {
  return [
    {
      id: "supplier_id",
      header: "仕入先",
      cell: (row) => {
        let content;
        // Use API-returned data first, fallback to map lookup
        if (row.supplier_code && row.supplier_name) {
          content = `${row.supplier_code} - ${row.supplier_name}`;
        } else {
          const s = supplierMap.get(row.supplier_id);
          content = s ? `${s.code} - ${s.name}` : `ID: ${row.supplier_id}`;
        }

        return (
          <div>
            <span>{content}</span>
            {isInactive(row.valid_to) && (
              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                削除済
              </span>
            )}
          </div>
        );
      },
      sortable: true,
    },
    {
      id: "product_id",
      header: "製品",
      cell: (row) => {
        // Use API-returned data first, fallback to map lookup
        if (row.product_code && row.product_name) {
          return `${row.product_code} - ${row.product_name}`;
        }
        const p = productMap.get(row.product_id);
        if (!p) return `ID: ${row.product_id}`;
        return `${p.code} - ${p.name}`;
      },
      sortable: true,
    },
    {
      id: "is_primary",
      header: "主要",
      cell: (row) => (row.is_primary ? "★" : ""),
      sortable: true,
    },
    {
      id: "lead_time_days",
      header: "ＬＴ(日)",
      cell: (row) => (row.lead_time_days != null ? `${row.lead_time_days}日` : "-"),
      sortable: true,
    },
    {
      id: "actions",
      header: "操作",
      cell: (row) => {
        const inactive = isInactive(row.valid_to);
        if (inactive) {
          return (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(row);
                }}
                title="復元"
              >
                <RotateCcw className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPermanentDelete(row);
                }}
                title="完全に削除"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSoftDelete(row);
              }}
            >
              <Trash2 className="text-destructive h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}

export function SupplierProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "supplier_id",
    direction: "asc",
  });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [editingItem, setEditingItem] = useState<SupplierProduct | null>(null);

  // Delete & Restore state
  const [deletingItem, setDeletingItem] = useState<SupplierProduct | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");
  const [restoringItem, setRestoringItem] = useState<SupplierProduct | null>(null);

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

  // Maps for efficient lookups
  const productMap = useMemo(() => {
    return new Map(
      products.map((p) => [p.id, { code: p.maker_item_code || "", name: p.product_name }]),
    );
  }, [products]);

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.id, { code: s.supplier_code, name: s.supplier_name }]));
  }, [suppliers]);

  const handleEditClick = (row: SupplierProduct) => {
    setEditingItem(row);
  };

  const handleDeleteClick = (row: SupplierProduct) => {
    setDeletingItem(row);
    setDeleteMode("soft");
  };

  const handlePermanentClick = (row: SupplierProduct) => {
    setDeletingItem(row);
    setDeleteMode("permanent");
  };

  const columns = useMemo(
    () =>
      createColumns(
        productMap,
        supplierMap,
        (row) => setRestoringItem(row),
        (row) => handlePermanentClick(row),
        (row) => handleEditClick(row),
        (row) => handleDeleteClick(row),
      ),
    [productMap, supplierMap],
  );

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
        <DataTable
          data={sortedData as SupplierProductWithValidTo[]}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="仕入先商品が登録されていません"
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
            <AlertDialogTitle>設定を復元しますか？</AlertDialogTitle>
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
