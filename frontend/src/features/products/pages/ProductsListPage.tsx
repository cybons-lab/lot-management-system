/**
 * ProductsListPage - 商品マスタ一覧
 */
import { Plus, Upload, Package } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Product } from "../api";
import { ProductBulkImportDialog } from "../components/ProductBulkImportDialog";
import { ProductExportButton } from "../components/ProductExportButton";
import { ProductForm, type ProductFormOutput } from "../components/ProductForm";
import { useProducts } from "../hooks/useProducts";

import { productColumns } from "./columns";
import * as styles from "./styles";

import { Button, Input } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function ProductsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "product_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { useList, useCreate } = useProducts();
  const { data: products = [], isLoading, isError, error, refetch } = useList();
  const { mutate: createProduct, isPending: isCreating } = useCreate();

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

  const handleCreate = useCallback(
    (data: ProductFormOutput) => {
      createProduct(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createProduct],
  );

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
          data={sortedProducts}
          columns={productColumns}
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
    </div>
  );
}
