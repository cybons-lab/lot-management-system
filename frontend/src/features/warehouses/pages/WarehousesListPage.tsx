/**
 * WarehousesListPage - 倉庫マスタ一覧
 */
import { Plus, Upload, Warehouse as WarehouseIcon } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Warehouse, WarehouseCreate } from "../api";
import { WarehouseBulkImportDialog } from "../components/WarehouseBulkImportDialog";
import { WarehouseExportButton } from "../components/WarehouseExportButton";
import { WarehouseForm } from "../components/WarehouseForm";
import { useCreateWarehouse } from "../hooks/useWarehouseMutations";
import { useWarehousesQuery } from "../hooks/useWarehousesQuery";

import { warehouseColumns } from "./columns";
import * as styles from "./styles";

import { Button, Input } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function WarehousesListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "warehouse_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { data: warehouses = [], isLoading } = useWarehousesQuery();
  const { mutate: createWarehouse, isPending: isCreating } = useCreateWarehouse();

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

  return (
    <div className={styles.root}>
      <PageHeader
        title="倉庫マスタ"
        subtitle="倉庫の作成・編集・削除、一括インポート/エクスポート"
        actions={
          <div className={styles.actionBar}>
            <WarehouseExportButton warehouses={sortedWarehouses} size="sm" />
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
          columns={warehouseColumns}
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
    </div>
  );
}
