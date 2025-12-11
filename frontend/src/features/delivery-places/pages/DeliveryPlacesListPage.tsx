/**
 * DeliveryPlacesListPage - 納入先マスタ一覧
 */
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import type { DeliveryPlace, DeliveryPlaceCreate, DeliveryPlaceUpdate } from "../api";
import { DeliveryPlaceForm } from "../components/DeliveryPlaceForm";
import {
  useDeliveryPlaces,
  useCreateDeliveryPlace,
  useUpdateDeliveryPlace,
  useSoftDeleteDeliveryPlace,
  usePermanentDeleteDeliveryPlace,
} from "../hooks";

import { Button, Input } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";
import { useCustomers } from "@/features/customers/hooks";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// Helper to check if item is inactive based on valid_to
const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  // valid_to is "YYYY-MM-DD"
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

// Extend DeliveryPlace type locally to include valid_to until types are synced
type DeliveryPlaceWithValidTo = DeliveryPlace & { valid_to?: string };

function createColumns(
  customerMap: Map<number, { customer_code: string; customer_name: string }>,
): Column<DeliveryPlaceWithValidTo>[] {
  return [
    {
      id: "delivery_place_code",
      header: "納入先コード",
      cell: (row) => (
        <div className="flex items-center">
          <span>{row.delivery_place_code}</span>
          {isInactive(row.valid_to) && (
            <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">無効</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: "delivery_place_name",
      header: "納入先名",
      cell: (row) => (
        <div className={isInactive(row.valid_to) ? "text-muted-foreground" : ""}>
          {row.delivery_place_name}
        </div>
      ),
      sortable: true,
    },
    {
      id: "customer_id",
      header: "得意先",
      cell: (row) => {
        const customer = customerMap.get(row.customer_id);
        if (!customer) return `ID: ${row.customer_id}`;
        return `${customer.customer_code} - ${customer.customer_name}`;
      },
      sortable: true,
    },
    {
      id: "jiku_code",
      header: "次区コード",
      cell: (row) => row.jiku_code || "-",
    },
  ];
}

// eslint-disable-next-line max-lines-per-function
export function DeliveryPlacesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "delivery_place_code",
    direction: "asc",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryPlace | null>(null);

  // Deletion state
  const [deletingItem, setDeletingItem] = useState<DeliveryPlace | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");

  const {
    data: deliveryPlaces = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDeliveryPlaces({
    includeInactive: true,
  });
  const { useList } = useCustomers();
  // Include soft-deleted customers to properly display names for delivery places
  const { data: customers = [] } = useList(true);
  const { mutate: create, isPending: isCreating } = useCreateDeliveryPlace();
  const { mutate: update, isPending: isUpdating } = useUpdateDeliveryPlace();

  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDeleteDeliveryPlace();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } =
    usePermanentDeleteDeliveryPlace();

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((c) => [
        c.id,
        { customer_code: c.customer_code, customer_name: c.customer_name },
      ]),
    );
  }, [customers]);

  const columns = useMemo(() => createColumns(customerMap), [customerMap]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return deliveryPlaces;
    const query = searchQuery.toLowerCase();
    return deliveryPlaces.filter(
      (d) =>
        d.delivery_place_code.toLowerCase().includes(query) ||
        d.delivery_place_name.toLowerCase().includes(query),
    );
  }, [deliveryPlaces, searchQuery]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof DeliveryPlace];
      const bVal = b[sort.column as keyof DeliveryPlace];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sort]);

  const handleCreate = useCallback(
    (data: DeliveryPlaceCreate) => {
      create(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [create],
  );

  const handleUpdate = useCallback(
    (data: DeliveryPlaceUpdate) => {
      if (!editingItem) return;
      update({ id: editingItem.id, data }, { onSuccess: () => setEditingItem(null) });
    },
    [editingItem, update],
  );

  const handleDeleteClick = (row: DeliveryPlace) => {
    setDeletingItem(row);
    setDeleteMode("soft");
  };

  const handleSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    softDelete(
      { id: deletingItem.id, endDate: endDate || undefined },
      {
        onSuccess: () => setDeletingItem(null),
      },
    );
  };

  const handlePermanentDelete = () => {
    if (!deletingItem) return;
    permanentDelete(deletingItem.id, {
      onSuccess: () => setDeletingItem(null),
    });
  };

  const actionColumn: Column<DeliveryPlaceWithValidTo> = {
    id: "actions",
    header: "操作",
    cell: (row) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditingItem(row);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(row);
          }}
        >
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>
    ),
  };

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader title="納入先マスタ" subtitle="納入先の作成・編集・削除" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="納入先マスタ"
        subtitle="納入先の作成・編集・削除"
        actions={
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-purple-50 p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-600">登録納入先数</p>
              <p className="text-2xl font-bold text-purple-700">{deliveryPlaces.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">納入先一覧</h3>
          <Input
            type="search"
            placeholder="コード・名称で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <DataTable
          data={sortedData as DeliveryPlaceWithValidTo[]}
          columns={[...columns, actionColumn]}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="納入先が登録されていません"
        />
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>納入先新規登録</DialogTitle>
          </DialogHeader>
          <DeliveryPlaceForm
            customers={customers}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>納入先編集</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <DeliveryPlaceForm
              initialData={editingItem}
              customers={customers}
              onSubmit={handleUpdate}
              onCancel={() => setEditingItem(null)}
              isSubmitting={isUpdating}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 削除ダイアログ (論理削除) */}
      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="納入先を無効化しますか？"
        description={`${deletingItem?.delivery_place_name}（${deletingItem?.delivery_place_code}）を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={() => setDeleteMode("permanent")}
      />

      {/* 完全削除ダイアログ (物理削除) */}
      <PermanentDeleteDialog
        open={!!deletingItem && deleteMode === "permanent"}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingItem(null);
            setDeleteMode("soft");
          }
        }}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
        title="納入先を完全に削除しますか？"
        description={`${deletingItem?.delivery_place_name} を完全に削除します。`}
        confirmationPhrase={deletingItem?.delivery_place_code || "delete"}
      />
    </div>
  );
}
