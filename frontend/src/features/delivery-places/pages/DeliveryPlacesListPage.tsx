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
  useDeleteDeliveryPlace,
} from "../hooks";

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
import { useCustomers } from "@/features/customers/hooks";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

function createColumns(
  customerMap: Map<number, { customer_code: string; customer_name: string }>,
): Column<DeliveryPlace>[] {
  return [
    {
      id: "delivery_place_code",
      header: "納入先コード",
      cell: (row) => row.delivery_place_code,
      sortable: true,
    },
    {
      id: "delivery_place_name",
      header: "納入先名",
      cell: (row) => row.delivery_place_name,
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
  const [deletingItem, setDeletingItem] = useState<DeliveryPlace | null>(null);

  const { data: deliveryPlaces = [], isLoading, isError, error, refetch } = useDeliveryPlaces();
  const { useList } = useCustomers();
  // Include soft-deleted customers to properly display names for delivery places
  const { data: customers = [] } = useList(true);
  const { mutate: create, isPending: isCreating } = useCreateDeliveryPlace();
  const { mutate: update, isPending: isUpdating } = useUpdateDeliveryPlace();
  const { mutate: remove, isPending: isDeleting } = useDeleteDeliveryPlace();

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

  const handleDelete = useCallback(() => {
    if (!deletingItem) return;
    remove(deletingItem.id, { onSuccess: () => setDeletingItem(null) });
  }, [deletingItem, remove]);

  const actionColumn: Column<DeliveryPlace> = {
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
          data={sortedData}
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

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open: boolean) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>納入先を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.delivery_place_name}（{deletingItem?.delivery_place_code}
              ）を削除します。 この操作は元に戻せません。
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
