/**
 * WarehousesListPage - 倉庫マスタ一覧
 */
import { Pencil, Plus, Trash2, Upload, Warehouse as WarehouseIcon } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Warehouse, WarehouseCreate } from "../api";
import { WarehouseBulkImportDialog } from "../components/WarehouseBulkImportDialog";
import { WarehouseExportButton } from "../components/WarehouseExportButton";
import { WarehouseForm } from "../components/WarehouseForm";
import { useWarehouses } from "../hooks";

import { warehouseColumns } from "./columns";
import * as styles from "./styles";

import { Button, Input } from "@/components/ui";
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
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function WarehousesListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "warehouse_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Warehouse | null>(null);

  const { useList, useCreate, useDelete } = useWarehouses();
  const { data: warehouses = [], isLoading, isError, error, refetch } = useList();
  const { mutate: createWarehouse, isPending: isCreating } = useCreate();
  const { mutate: deleteWarehouse, isPending: isDeleting } = useDelete();

  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses;
    const query = searchQuery.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.warehouse_code.toLowerCase().includes(query) ||
        w.warehouse_name.toLowerCase().includes(query),
    );
  }, [warehouses, searchQuery]);

  const sortedWarehouses = useMemo(() => {
    const sorted = [...filteredWarehouses];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof Warehouse];
      const bVal = b[sort.column as keyof Warehouse];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredWarehouses, sort]);

  const handleRowClick = useCallback(
    (warehouse: Warehouse) => {
      navigate(`/warehouses/${warehouse.warehouse_code}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(
    (data: WarehouseCreate) => {
      createWarehouse(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createWarehouse],
  );

  const handleDelete = useCallback(() => {
    if (!deletingItem) return;
    deleteWarehouse(deletingItem.id, {
      onSuccess: () => setDeletingItem(null),
    });
  }, [deletingItem, deleteWarehouse]);

  const actionColumn: Column<Warehouse> = {
    id: "actions",
    header: "操作",
    cell: (row) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/warehouses/${row.warehouse_code}`);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeletingItem(row);
          }}
        >
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>
    ),
  };

  if (isError) {
    return (
      <div className={styles.root}>
        <PageHeader
          title="倉庫マスタ"
          subtitle="倉庫の作成・編集・削除、一括インポート/エクスポート"
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title="倉庫マスタ"
        subtitle="倉庫の作成・編集・削除、一括インポート/エクスポート"
        actions={
          <div className={styles.actionBar}>
            <WarehouseExportButton size="sm" />
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
            <WarehouseIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録倉庫数</p>
              <p className={styles.statsValue({ color: "blue" })}>{warehouses.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>倉庫一覧</h3>
          <div className={styles.tableActions}>
            <Input
              type="search"
              placeholder="コード・名称で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
        <DataTable
          data={sortedWarehouses}
          columns={[...warehouseColumns, actionColumn]}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="倉庫が登録されていません"
        />
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>倉庫新規登録</DialogTitle>
          </DialogHeader>
          <WarehouseForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <WarehouseBulkImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />

      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open: boolean) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>倉庫を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.warehouse_name}（{deletingItem?.warehouse_code}）を削除します。
              この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
