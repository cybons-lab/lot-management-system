/**
 * SuppliersListPage - 仕入先マスタ一覧
 */
import { Plus, Upload, Truck } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Supplier, SupplierCreate } from "../api";
import { SupplierBulkImportDialog } from "../components/SupplierBulkImportDialog";
import { SupplierExportButton } from "../components/SupplierExportButton";
import { SupplierForm } from "../components/SupplierForm";
import { useSuppliers } from "../hooks";

import { supplierColumns } from "./columns";
import * as styles from "./styles";

import { Button, Input } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SuppliersListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "supplier_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { useList, useCreate } = useSuppliers();
  const { data: suppliers = [], isLoading } = useList();
  const { mutate: createSupplier, isPending: isCreating } = useCreate();

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
          columns={supplierColumns}
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

      <SupplierBulkImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </div>
  );
}
