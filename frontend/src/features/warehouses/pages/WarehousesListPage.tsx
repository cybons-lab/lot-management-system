import { Warehouse as WarehouseIcon } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Warehouse, WarehouseCreate } from "../api";
import { WarehouseBulkImportDialog } from "../components/WarehouseBulkImportDialog";
import { WarehouseForm } from "../components/WarehouseForm";
import { useWarehouses } from "../hooks";

import { createWarehouseColumns } from "./columns";
import * as styles from "./styles";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useListPageDialogs } from "@/hooks/ui";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// Extend Warehouse type locally if needed
type WarehouseWithValidTo = Warehouse & { valid_to?: string };

export function WarehousesListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "warehouse_code", direction: "asc" });
  const [showInactive, setShowInactive] = useState(false);

  // Dialog management with shared hook
  const {
    isCreateOpen,
    isImportOpen,
    isSoftDeleteOpen,
    isPermanentDeleteOpen,
    isRestoreOpen,
    deletingItem,
    restoringItem,
    openCreate,
    openImport,
    openSoftDelete,
    openPermanentDelete,
    openRestore,
    close,
    switchToPermanentDelete,
  } = useListPageDialogs<Warehouse>();

  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useWarehouses();
  const { data: warehouses = [], isLoading, isError, error, refetch } = useList(showInactive);
  const { mutate: createWarehouse, isPending: isCreating } = useCreate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

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

  const columns = useMemo(
    () =>
      createWarehouseColumns({
        onRestore: (row) => openRestore(row),
        onPermanentDelete: (row) => openPermanentDelete(row),
        onEdit: (row) => navigate(`/warehouses/${row.warehouse_code}`),
        onSoftDelete: (row) => openSoftDelete(row),
      }),
    [navigate, openRestore, openPermanentDelete, openSoftDelete],
  );

  const handleCreate = useCallback(
    (data: WarehouseCreate) => {
      createWarehouse(data, { onSuccess: close });
    },
    [createWarehouse, close],
  );

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDelete(
      { id: deletingItem.warehouse_code, endDate: endDate || undefined },
      { onSuccess: close },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(deletingItem.warehouse_code, { onSuccess: close });
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.warehouse_code, { onSuccess: close });
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
          <MasterPageActions
            exportApiPath="masters/warehouses/export/download"
            exportFilePrefix="warehouses"
            onImportClick={openImport}
            onCreateClick={openCreate}
          />
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
              placeholder="コード・名称で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
        <DataTable
          data={sortedWarehouses as WarehouseWithValidTo[]}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="倉庫が登録されていません"
        />
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>倉庫新規登録</DialogTitle>
          </DialogHeader>
          <WarehouseForm onSubmit={handleCreate} onCancel={close} isSubmitting={isCreating} />
        </DialogContent>
      </Dialog>

      <WarehouseBulkImportDialog open={isImportOpen} onOpenChange={(open) => !open && close()} />

      <SoftDeleteDialog
        open={isSoftDeleteOpen}
        onOpenChange={(open) => !open && close()}
        title="倉庫を無効化しますか？"
        description={`${deletingItem?.warehouse_name}（${deletingItem?.warehouse_code}）を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={switchToPermanentDelete}
      />

      <PermanentDeleteDialog
        open={isPermanentDeleteOpen}
        onOpenChange={(open) => !open && close()}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
        title="倉庫を完全に削除しますか？"
        description={`${deletingItem?.warehouse_name} を完全に削除します。`}
        confirmationPhrase={deletingItem?.warehouse_code || "delete"}
      />

      <RestoreDialog
        open={isRestoreOpen}
        onOpenChange={(open) => !open && close()}
        onConfirm={handleRestore}
        isPending={isRestoring}
        title="倉庫を復元しますか？"
        description={`${restoringItem?.warehouse_name} を有効状態に戻します。`}
      />
    </div>
  );
}
