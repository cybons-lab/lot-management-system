/**
 * CustomersListPage
 * 得意先マスタ一覧ページ
 */

import { Pencil, Plus, Trash2, Upload, Users } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Customer, CustomerCreate } from "../api";
import { CustomerExportButton } from "../components/CustomerExportButton";
import { CustomerForm } from "../components/CustomerForm";
import { useCustomers } from "../hooks";

import { customerColumns } from "./columns";
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

// ============================================
// Component
// ============================================

export function CustomersListPage() {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "customer_code", direction: "asc" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Customer | null>(null);

  // Data
  const { useList, useCreate, useDelete } = useCustomers();
  const { data: customers = [], isLoading, isError, error, refetch } = useList();
  const { mutate: createCustomer, isPending: isCreating } = useCreate();
  const { mutate: deleteCustomer, isPending: isDeleting } = useDelete();

  // フィルタリング
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.customer_code.toLowerCase().includes(query) ||
        c.customer_name.toLowerCase().includes(query),
    );
  }, [customers, searchQuery]);

  // ソート
  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers];
    sorted.sort((a, b) => {
      const aValue = a[sort.column as keyof Customer];
      const bValue = b[sort.column as keyof Customer];

      if (aValue === undefined || bValue === undefined) return 0;

      const comparison = String(aValue).localeCompare(String(bValue), "ja");
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredCustomers, sort]);

  // 行クリック
  const handleRowClick = useCallback(
    (customer: Customer) => {
      navigate(`/customers/${customer.customer_code}`);
    },
    [navigate],
  );

  // 新規登録
  const handleCreate = useCallback(
    (data: CustomerCreate) => {
      createCustomer(data, {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
        },
      });
    },
    [createCustomer],
  );

  // 削除
  const handleDelete = useCallback(() => {
    if (!deletingItem) return;
    deleteCustomer(deletingItem.customer_code, {
      onSuccess: () => setDeletingItem(null),
    });
  }, [deletingItem, deleteCustomer]);

  // 操作カラム
  const actionColumn: Column<Customer> = {
    id: "actions",
    header: "操作",
    cell: (row) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/customers/${row.customer_code}`);
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

  // 統計
  const stats = useMemo(
    () => ({
      total: customers.length,
      filtered: filteredCustomers.length,
    }),
    [customers.length, filteredCustomers.length],
  );

  if (isError) {
    return (
      <div className={styles.root}>
        <PageHeader
          title="得意先マスタ"
          subtitle="得意先の作成・編集・削除、一括インポート/エクスポート"
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title="得意先マスタ"
        subtitle="得意先の作成・編集・削除、一括インポート/エクスポート"
        actions={
          <div className={styles.actionBar}>
            <CustomerExportButton size="sm" />
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

      {/* 統計カード */}
      <div className={styles.statsGrid}>
        <div className={styles.statsCard({ variant: "blue" })}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録得意先数</p>
              <p className={styles.statsValue({ color: "blue" })}>{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* テーブルコンテナ */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>得意先一覧</h3>
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
          data={sortedCustomers}
          columns={[...customerColumns, actionColumn]}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="得意先が登録されていません"
        />
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>得意先新規登録</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <MasterImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="得意先マスタ インポート"
        group="customer"
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open: boolean) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>得意先を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.customer_name}（{deletingItem?.customer_code}）を削除します。
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
