import { Package, Pencil, Plus, Trash2, Upload, RotateCcw } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Product } from "../api";
import { ProductBulkImportDialog } from "../components/ProductBulkImportDialog";
import { ProductExportButton } from "../components/ProductExportButton";
import { ProductForm, type ProductFormOutput } from "../components/ProductForm";
import { useProducts } from "../hooks/useProducts";

import * as styles from "./styles";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Button, Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { formatDate } from "@/shared/utils/date";

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

// Extend Product type locally if needed
type ProductWithValidTo = Product & { valid_to?: string };

function createColumns(
  onRestore: (row: ProductWithValidTo) => void,
  onPermanentDelete: (row: ProductWithValidTo) => void,
  onEdit: (row: ProductWithValidTo) => void,
  onSoftDelete: (row: ProductWithValidTo) => void,
): Column<ProductWithValidTo>[] {
  return [
    {
      id: "product_code",
      header: "先方品番",
      cell: (row) => (
        <div className="flex items-center">
          <span className="font-mono text-sm font-medium text-gray-900">{row.product_code}</span>
          {isInactive(row.valid_to) && (
            <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              削除済
            </span>
          )}
        </div>
      ),
      sortable: true,
      width: "200px",
    },
    {
      id: "product_name",
      header: "商品名",
      cell: (row) => (
        <span
          className={`block max-w-[300px] truncate ${isInactive(row.valid_to) ? "text-muted-foreground" : "text-gray-900"}`}
          title={row.product_name}
        >
          {row.product_name}
        </span>
      ),
      sortable: true,
      width: "300px",
    },
    {
      id: "internal_unit",
      header: "社内単位",
      cell: (row) => <span className="text-sm text-gray-700">{row.internal_unit}</span>,
      sortable: true,
      width: "100px",
    },
    {
      id: "external_unit",
      header: "外部単位",
      cell: (row) => <span className="text-sm text-gray-700">{row.external_unit}</span>,
      sortable: true,
      width: "120px",
    },
    {
      id: "qty_per_internal_unit",
      header: "数量/内部単位",
      cell: (row) => <span className="text-sm text-gray-700">{row.qty_per_internal_unit}</span>,
      sortable: true,
      width: "150px",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (row) => <div className="text-center font-medium">{formatDate(row.updated_at)}</div>,
      sortable: true,
      width: "150px",
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

export function ProductsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "product_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Delete & Restore state
  const [deletingItem, setDeletingItem] = useState<Product | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");
  const [restoringItem, setRestoringItem] = useState<Product | null>(null);

  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useProducts();
  const { data: products = [], isLoading, isError, error, refetch } = useList(showInactive);
  const { mutate: createProduct, isPending: isCreating } = useCreate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

  // エラー時は簡易表示
  // Note: hooksの呼び出し順序を維持するため、条件分岐は後で行う

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.product_code.toLowerCase().includes(query) ||
        p.product_name.toLowerCase().includes(query) ||
        (p.maker_item_code?.toLowerCase() ?? "").includes(query),
    );
  }, [products, searchQuery]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof Product];
      const bVal = b[sort.column as keyof Product];
      if (aVal === undefined || aVal === null || bVal === undefined || bVal === null) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredProducts, sort]);

  const handleRowClick = useCallback(
    (product: Product) => {
      navigate(`/products/${product.product_code}`);
    },
    [navigate],
  );

  const handleDeleteClick = (row: Product) => {
    setDeletingItem(row);
    setDeleteMode("soft");
  };

  const handlePermanentClick = (row: Product) => {
    setDeletingItem(row);
    setDeleteMode("permanent");
  };

  const columns = useMemo(
    () =>
      createColumns(
        (row) => setRestoringItem(row),
        (row) => handlePermanentClick(row),
        (row) => navigate(`/products/${row.product_code}`),
        (row) => handleDeleteClick(row),
      ),
    [navigate],
  );

  const handleCreate = useCallback(
    (data: ProductFormOutput) => {
      createProduct(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createProduct],
  );

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDelete(
      { id: deletingItem.product_code, endDate: endDate || undefined },
      {
        onSuccess: () => setDeletingItem(null),
      },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(deletingItem.product_code, {
      onSuccess: () => setDeletingItem(null),
    });
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.product_code, {
      onSuccess: () => setRestoringItem(null),
    });
  };

  if (isError) {
    return (
      <div className={styles.root}>
        <PageHeader
          title="商品マスタ"
          subtitle="商品の作成・編集・削除、一括インポート/エクスポート"
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title="商品マスタ"
        subtitle="商品の作成・編集・削除、一括インポート/エクスポート"
        actions={
          <div className={styles.actionBar}>
            <ProductExportButton size="sm" />
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

      <div className={styles.statsGrid}>
        <div className={styles.statsCard({ variant: "blue" })}>
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録商品数</p>
              <p className={styles.statsValue({ color: "blue" })}>{products.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>商品一覧</h3>
          <div className={styles.tableActions}>
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
              placeholder="品番・名称で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
        <DataTable
          data={sortedProducts as ProductWithValidTo[]}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="商品が登録されていません"
        />
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>商品新規登録</DialogTitle>
          </DialogHeader>
          <ProductForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <ProductBulkImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />

      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="商品を無効化しますか？"
        description={`${deletingItem?.product_name}（${deletingItem?.product_code}）を無効化します。`}
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
        title="商品を完全に削除しますか？"
        description={`${deletingItem?.product_name} を完全に削除します。`}
        confirmationPhrase={deletingItem?.product_code || "delete"}
      />

      <RestoreDialog
        open={!!restoringItem}
        onOpenChange={(open) => !open && setRestoringItem(null)}
        onConfirm={handleRestore}
        isPending={isRestoring}
        title="商品を復元しますか？"
        description={`${restoringItem?.product_name} を有効状態に戻します。`}
      />
    </div>
  );
}
