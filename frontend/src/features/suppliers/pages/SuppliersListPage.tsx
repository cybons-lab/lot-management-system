/**
 * SuppliersListPage - 仕入先マスタ一覧
 */
import { Pencil, Plus, Trash2, Truck, Upload } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Supplier, SupplierCreate } from "../api";
import { SupplierExportButton } from "../components/SupplierExportButton";
import { SupplierForm } from "../components/SupplierForm";
import { useSuppliers } from "../hooks";

import { supplierColumns } from "./columns";
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
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SuppliersListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "supplier_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Supplier | null>(null);

  const { useList, useCreate, useDelete } = useSuppliers();
  const { data: suppliers = [], isLoading, isError, error, refetch } = useList();
  const { mutate: createSupplier, isPending: isCreating } = useCreate();
  const { mutate: deleteSupplier, isPending: isDeleting } = useDelete();

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.supplier_code.toLowerCase().includes(query) ||
        s.supplier_name.toLowerCase().includes(query),
    );
  }, [suppliers, searchQuery]);

  const sortedSuppliers = useMemo(() => {
    const sorted = [...filteredSuppliers];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof Supplier];
      const bVal = b[sort.column as keyof Supplier];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredSuppliers, sort]);

  const handleRowClick = useCallback(
    (supplier: Supplier) => {
      navigate(`/suppliers/${supplier.supplier_code}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(
    (data: SupplierCreate) => {
      createSupplier(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [createSupplier],
  );

  const handleDelete = useCallback(() => {
    if (!deletingItem) return;
    deleteSupplier(deletingItem.id, {
      onSuccess: () => setDeletingItem(null),
    });
  }, [deletingItem, deleteSupplier]);

  const actionColumn: Column<Supplier> = {
    id: "actions",
    header: "操作",
    cell: (row) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/suppliers/${row.supplier_code}`);
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
          title="仕入先マスタ"
          subtitle="仕入先の作成・編集・削除、一括インポート/エクスポート"
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title="仕入先マスタ"
        subtitle="仕入先の作成・編集・削除、一括インポート/エクスポート"
        actions={
          <div className={styles.actionBar}>
            <SupplierExportButton size="sm" />
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
            <Truck className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録仕入先数</p>
              <p className={styles.statsValue({ color: "blue" })}>{suppliers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>仕入先一覧</h3>
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
          data={sortedSuppliers}
          columns={[...supplierColumns, actionColumn]}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="仕入先が登録されていません"
        />
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>仕入先新規登録</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <MasterImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="仕入先マスタ インポート"
        group="supply"
      />

      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open: boolean) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>仕入先を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.supplier_name}（{deletingItem?.supplier_code}）を削除します。
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
