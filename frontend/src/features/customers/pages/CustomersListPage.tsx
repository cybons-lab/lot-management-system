import { Users, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Customer, CustomerCreate } from "../api";
import { CustomerForm } from "../components/CustomerForm";
import { useCustomers } from "../hooks";

import * as styles from "./styles";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Button, Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { useListPageDialogs } from "@/hooks/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { formatDate } from "@/shared/utils/date";

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

// Extend Customer type locally if needed
type CustomerWithValidTo = Customer & { valid_to?: string };

function createColumns(
  onRestore: (row: CustomerWithValidTo) => void,
  onPermanentDelete: (row: CustomerWithValidTo) => void,
  onEdit: (row: CustomerWithValidTo) => void,
  onSoftDelete: (row: CustomerWithValidTo) => void,
): Column<CustomerWithValidTo>[] {
  return [
    {
      id: "customer_code",
      header: "得意先コード",
      cell: (row) => (
        <div className="flex items-center">
          <span className="font-mono text-sm font-medium text-gray-900">{row.customer_code}</span>
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
      id: "customer_name",
      header: "得意先名",
      cell: (row) => (
        <span
          className={`block max-w-[300px] truncate ${isInactive(row.valid_to) ? "text-muted-foreground" : "text-gray-900"}`}
          title={row.customer_name}
        >
          {row.customer_name}
        </span>
      ),
      sortable: true,
      width: "300px",
    },
    {
      id: "created_at",
      header: "作成日時",
      cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.created_at)}</span>,
      sortable: true,
      width: "150px",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.updated_at)}</span>,
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

export function CustomersListPage() {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "customer_code", direction: "asc" });
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
  } = useListPageDialogs<Customer>();

  // Data
  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useCustomers();
  const { data: customers = [], isLoading, isError, error, refetch } = useList(showInactive);
  const { mutate: createCustomer, isPending: isCreating } = useCreate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

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

  const handleRowClick = useCallback(
    (customer: Customer) => {
      navigate(`/customers/${customer.customer_code}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () =>
      createColumns(
        (row) => openRestore(row),
        (row) => openPermanentDelete(row),
        (row) => navigate(`/customers/${row.customer_code}`),
        (row) => openSoftDelete(row),
      ),
    [navigate, openRestore, openPermanentDelete, openSoftDelete],
  );

  // 新規登録
  const handleCreate = useCallback(
    (data: CustomerCreate) => {
      createCustomer(data, { onSuccess: close });
    },
    [createCustomer, close],
  );

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDelete(
      { id: deletingItem.customer_code, endDate: endDate || undefined },
      { onSuccess: close },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(deletingItem.customer_code, { onSuccess: close });
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.customer_code, { onSuccess: close });
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
          <MasterPageActions
            exportApiPath="masters/customers/export/download"
            exportFilePrefix="customers"
            onImportClick={openImport}
            onCreateClick={openCreate}
          />
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
          data={sortedCustomers as CustomerWithValidTo[]}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="得意先が登録されていません"
        />
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>得意先新規登録</DialogTitle>
          </DialogHeader>
          <CustomerForm onSubmit={handleCreate} onCancel={close} isSubmitting={isCreating} />
        </DialogContent>
      </Dialog>

      <MasterImportDialog
        open={isImportOpen}
        onOpenChange={(open) => !open && close()}
        title="得意先マスタ インポート"
        group="customer"
      />

      <SoftDeleteDialog
        open={isSoftDeleteOpen}
        onOpenChange={(open) => !open && close()}
        title="得意先を無効化しますか？"
        description={`${deletingItem?.customer_name}（${deletingItem?.customer_code}）を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={switchToPermanentDelete}
      />

      <PermanentDeleteDialog
        open={isPermanentDeleteOpen}
        onOpenChange={(open) => !open && close()}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
        title="得意先を完全に削除しますか？"
        description={`${deletingItem?.customer_name} を完全に削除します。`}
        confirmationPhrase={deletingItem?.customer_code || "delete"}
      />

      <RestoreDialog
        open={isRestoreOpen}
        onOpenChange={(open) => !open && close()}
        onConfirm={handleRestore}
        isPending={isRestoring}
        title="得意先を復元しますか？"
        description={`${restoringItem?.customer_name} を有効状態に戻します。`}
      />
    </div>
  );
}
