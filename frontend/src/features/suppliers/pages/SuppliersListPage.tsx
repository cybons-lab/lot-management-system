import { Pencil, Trash2, Truck, RotateCcw } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { Supplier, SupplierCreate } from "../api";
import { SupplierForm } from "../components/SupplierForm";
import { useSuppliers } from "../hooks";

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

// Extend Supplier type locally if needed, but api.d.ts should have valid_to
type SupplierWithValidTo = Supplier & { valid_to?: string };

function createColumns(
  onRestore: (row: SupplierWithValidTo) => void,
  onPermanentDelete: (row: SupplierWithValidTo) => void,
  onEdit: (row: SupplierWithValidTo) => void,
  onSoftDelete: (row: SupplierWithValidTo) => void,
): Column<SupplierWithValidTo>[] {
  return [
    {
      id: "supplier_code",
      header: "仕入先コード",
      cell: (row) => (
        <div className="flex items-center">
          <span className="font-mono text-sm font-medium text-gray-900">{row.supplier_code}</span>
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
      id: "supplier_name",
      header: "仕入先名",
      cell: (row) => (
        <span
          className={`block max-w-[300px] truncate ${isInactive(row.valid_to) ? "text-muted-foreground" : "text-gray-900"}`}
          title={row.supplier_name}
        >
          {row.supplier_name}
        </span>
      ),
      sortable: true,
      width: "300px",
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

export function SuppliersListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "supplier_code", direction: "asc" });
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
  } = useListPageDialogs<Supplier>();

  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useSuppliers();
  const { data: suppliers = [], isLoading, isError, error, refetch } = useList(showInactive);
  const { mutate: createSupplier, isPending: isCreating } = useCreate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

  const handleRowClick = useCallback(
    (supplier: Supplier) => {
      navigate(`/suppliers/${supplier.supplier_code}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () =>
      createColumns(
        (row) => openRestore(row),
        (row) => openPermanentDelete(row),
        (row) => navigate(`/suppliers/${row.supplier_code}`),
        (row) => openSoftDelete(row),
      ),
    [navigate, openRestore, openPermanentDelete, openSoftDelete],
  );

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

  const handleCreate = useCallback(
    (data: SupplierCreate) => {
      createSupplier(data, { onSuccess: close });
    },
    [createSupplier, close],
  );

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDelete(
      { id: deletingItem.supplier_code, endDate: endDate || undefined },
      { onSuccess: close },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(deletingItem.supplier_code, { onSuccess: close });
  };

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.supplier_code, { onSuccess: close });
  };

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader
          title="仕入先マスタ"
          subtitle="仕入先の作成・編集・削除、一括インポート/エクスポート"
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="仕入先マスタ"
        subtitle="仕入先の作成・編集・削除、一括インポート/エクスポート"
        actions={
          <MasterPageActions
            exportApiPath="masters/suppliers/export/download"
            exportFilePrefix="suppliers"
            onImportClick={openImport}
            onCreateClick={openCreate}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">登録仕入先数</p>
              <p className="text-2xl font-bold text-blue-700">{suppliers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">仕入先一覧</h3>
          <div className="flex items-center gap-4">
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
              className="w-64"
            />
          </div>
        </div>
        <DataTable
          data={sortedSuppliers as SupplierWithValidTo[]}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="仕入先が登録されていません"
        />
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>仕入先新規登録</DialogTitle>
          </DialogHeader>
          <SupplierForm onSubmit={handleCreate} onCancel={close} isSubmitting={isCreating} />
        </DialogContent>
      </Dialog>

      <MasterImportDialog
        open={isImportOpen}
        onOpenChange={(open) => !open && close()}
        title="仕入先マスタ インポート"
        group="supply"
      />

      <SoftDeleteDialog
        open={isSoftDeleteOpen}
        onOpenChange={(open) => !open && close()}
        title="仕入先を無効化しますか？"
        description={`${deletingItem?.supplier_name}（${deletingItem?.supplier_code}）を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={switchToPermanentDelete}
      />

      <PermanentDeleteDialog
        open={isPermanentDeleteOpen}
        onOpenChange={(open) => !open && close()}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
        title="仕入先を完全に削除しますか？"
        description={`${deletingItem?.supplier_name} を完全に削除します。`}
        confirmationPhrase={deletingItem?.supplier_code || "delete"}
      />

      <RestoreDialog
        open={isRestoreOpen}
        onOpenChange={(open) => !open && close()}
        onConfirm={handleRestore}
        isPending={isRestoring}
        title="仕入先を復元しますか？"
        description={`${restoringItem?.supplier_name} を有効状態に戻します。`}
      />
    </div>
  );
}
