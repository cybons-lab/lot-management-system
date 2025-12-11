/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/**
 * DeliveryPlacesListPage - 納入先マスタ一覧
 */
import { MapPin, Plus } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import type { DeliveryPlaceCreate, DeliveryPlaceUpdate } from "../api";
import { DeliveryPlaceForm } from "../components/DeliveryPlaceForm";
import {
  DeliveryPlacesTable,
  type DeliveryPlaceWithValidTo,
} from "../components/DeliveryPlacesTable";
import {
  useDeliveryPlaces,
  useCreateDeliveryPlace,
  useUpdateDeliveryPlace,
  useSoftDeleteDeliveryPlace,
  usePermanentDeleteDeliveryPlace,
  useRestoreDeliveryPlace,
} from "../hooks";

import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";
import { Button, Input, Checkbox } from "@/components/ui";
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
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useCustomers } from "@/features/customers/hooks";
import type { SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function DeliveryPlacesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "delivery_place_code",
    direction: "asc",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryPlaceWithValidTo | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Deletion state
  const [deletingItem, setDeletingItem] = useState<DeliveryPlaceWithValidTo | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");

  // Restore state
  const [restoringItem, setRestoringItem] = useState<DeliveryPlaceWithValidTo | null>(null);

  const {
    data: deliveryPlaces = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDeliveryPlaces({
    includeInactive: showInactive,
  });
  const { useList } = useCustomers();
  // Include soft-deleted customers to properly display names for delivery places
  const { data: customers = [] } = useList(true);
  const { mutate: create, isPending: isCreating } = useCreateDeliveryPlace();
  const { mutate: update, isPending: isUpdating } = useUpdateDeliveryPlace();

  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDeleteDeliveryPlace();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } =
    usePermanentDeleteDeliveryPlace();
  const { mutate: restore, isPending: isRestoring } = useRestoreDeliveryPlace();

  const handleDeleteClick = (row: DeliveryPlaceWithValidTo) => {
    setDeletingItem(row);
    setDeleteMode("soft");
  };

  const handlePermanentClick = (row: DeliveryPlaceWithValidTo) => {
    setDeletingItem(row);
    setDeleteMode("permanent");
  };

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
      // @ts-expect-error: sorting logic works with index access for basic properties
      const aVal = a[sort.column];
      // @ts-expect-error: sorting logic works with index access for basic properties
      const bVal = b[sort.column];
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

  const handleRestore = () => {
    if (!restoringItem) return;
    restore(restoringItem.id, {
      onSuccess: () => setRestoringItem(null),
    });
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
        <DeliveryPlacesTable
          customers={customers}
          deliveryPlaces={sortedData}
          isLoading={isLoading}
          sort={sort}
          onSortChange={setSort}
          onEdit={setEditingItem}
          onSoftDelete={handleDeleteClick}
          onPermanentDelete={handlePermanentClick}
          onRestore={setRestoringItem}
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
        onOpenChange={(open: boolean) => {
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

      {/* 復元確認ダイアログ */}
      <AlertDialog
        open={!!restoringItem}
        onOpenChange={(open: boolean) => !open && setRestoringItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>納入先を復元しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {restoringItem?.delivery_place_name} を有効状態に戻します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? "復元中..." : "復元"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
