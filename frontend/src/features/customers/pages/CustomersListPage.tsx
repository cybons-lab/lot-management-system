import { Users, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom"; removed
import { toast } from "sonner";

import type { Customer, CustomerCreate } from "../api";
import { CustomerDetailDialog } from "../components/CustomerDetailDialog";
import { CustomerForm } from "../components/CustomerForm";
import { useCustomers } from "../hooks";

import * as styles from "./styles";

import {
  SoftDeleteDialog,
  PermanentDeleteDialog,
  RestoreDialog,
  BulkPermanentDeleteDialog,
  BulkSoftDeleteDialog,
} from "@/components/common";
import { Button, Input, Checkbox, RefreshButton } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useAuth } from "@/features/auth/AuthContext";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { useListPageDialogs, useTable } from "@/hooks/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
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
  // navigate removed as it is no longer used

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "customer_code", direction: "asc" });
  const [showInactive, setShowInactive] = useState(false);
  const table = useTable({ initialPageSize: 25 });

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
  const {
    mutate: softDelete,
    mutateAsync: softDeleteAsync,
    isPending: isSoftDeleting,
  } = useSoftDelete();
  const {
    mutate: permanentDelete,
    mutateAsync: permanentDeleteAsync,
    isPending: isPermanentDeleting,
  } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

  // 管理者権限チェック
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;

  // 一括削除用の状態
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // ページネーション
  const paginatedCustomers = table.paginateData(sortedCustomers);

  const [selectedCustomerCode, setSelectedCustomerCode] = useState<string | null>(null);

  const handleRowClick = useCallback((customer: Customer) => {
    setSelectedCustomerCode(customer.customer_code);
  }, []);

  const columns = useMemo(
    () =>
      createColumns(
        (row) => openRestore(row),
        (row) => openPermanentDelete(row),
        (row) => setSelectedCustomerCode(row.customer_code),
        (row) => openSoftDelete(row),
      ),
    [openRestore, openPermanentDelete, openSoftDelete],
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
      {
        id: deletingItem.customer_code,
        version: deletingItem.version,
        endDate: endDate || undefined,
      },
      { onSuccess: close },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(
      { id: deletingItem.customer_code, version: deletingItem.version },
      { onSuccess: close },
    );
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.customer_code, { onSuccess: close });
  };

  // 一括物理削除（管理者用）
  const executeBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const versionMap = new Map(
        customers.map((customer) => [customer.customer_code, customer.version]),
      );
      const results = await Promise.allSettled(
        selectedIds.map((id) => {
          const version = versionMap.get(id as string);
          if (version == null) {
            return Promise.reject(new Error("version not found"));
          }
          return permanentDeleteAsync({ id: id as string, version });
        }),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(`${succeeded} 件を完全に削除しました`);
      } else if (succeeded === 0) {
        toast.error(`${failed} 件の削除に失敗しました`);
      } else {
        toast.warning(`${succeeded} 件を削除、${failed} 件が失敗しました`);
      }
      setSelectedIds([]);
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  // 一括論理削除（非管理者用）
  const executeBulkSoftDelete = async (endDate: string | null) => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const versionMap = new Map(
        customers.map((customer) => [customer.customer_code, customer.version]),
      );
      const results = await Promise.allSettled(
        selectedIds.map((id) => {
          const version = versionMap.get(id as string);
          if (version == null) {
            return Promise.reject(new Error("version not found"));
          }
          return softDeleteAsync({
            id: id as string,
            version,
            endDate: endDate ?? undefined,
          });
        }),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(`${succeeded} 件を無効化しました`);
      } else if (succeeded === 0) {
        toast.error(`${failed} 件の無効化に失敗しました`);
      } else {
        toast.warning(`${succeeded} 件を無効化、${failed} 件が失敗しました`);
      }
      setSelectedIds([]);
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
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
          backLink={{ to: "/masters", label: "マスタ管理" }}
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
        backLink={{ to: "/masters", label: "マスタ管理" }}
        actions={
          <div className="flex gap-2">
            <RefreshButton
              queryKey={["customers", { includeInactive: showInactive }]}
              isLoading={isLoading}
            />
            <MasterPageActions
              exportApiPath="masters/customers/export/download"
              exportFilePrefix="customers"
              onImportClick={openImport}
              onCreateClick={openCreate}
            />
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

        {/* 一括操作バー */}
        {selectedIds.length > 0 && (
          <div
            className={`flex items-center justify-between rounded-lg border p-3 ${
              isAdmin ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <span className={`text-sm font-medium ${isAdmin ? "text-red-800" : "text-amber-800"}`}>
              {selectedIds.length} 件選択中
            </span>
            <Button
              variant={isAdmin ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className={!isAdmin ? "border-amber-600 text-amber-700 hover:bg-amber-100" : ""}
              data-testid={isAdmin ? "bulk-delete-button" : "bulk-inactivate-button"}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isAdmin ? "一括削除" : "一括無効化"}
            </Button>
          </div>
        )}

        <DataTable
          data={paginatedCustomers as CustomerWithValidTo[]}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.customer_code}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="得意先が登録されていません"
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
        {sortedCustomers.length > 0 && (
          <TablePagination
            currentPage={table.calculatePagination(sortedCustomers.length).page ?? 1}
            pageSize={table.calculatePagination(sortedCustomers.length).pageSize ?? 25}
            totalCount={sortedCustomers.length}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            pageSizeOptions={[25, 50, 100]}
          />
        )}
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

      {/* 一括削除ダイアログ（管理者: 物理削除、非管理者: 論理削除） */}
      {isAdmin ? (
        <BulkPermanentDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          selectedCount={selectedIds.length}
          onConfirm={executeBulkPermanentDelete}
          isPending={isBulkDeleting}
          title="選択した得意先を完全に削除しますか？"
          description={`選択された ${selectedIds.length} 件の得意先を完全に削除します。`}
        />
      ) : (
        <BulkSoftDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          selectedCount={selectedIds.length}
          onConfirm={executeBulkSoftDelete}
          isPending={isBulkDeleting}
          title="選択した得意先を無効化しますか？"
          description={`選択された ${selectedIds.length} 件の得意先を無効化します。`}
        />
      )}
      <CustomerDetailDialog
        customerCode={selectedCustomerCode}
        open={!!selectedCustomerCode}
        onOpenChange={(open) => !open && setSelectedCustomerCode(null)}
      />
    </div>
  );
}
