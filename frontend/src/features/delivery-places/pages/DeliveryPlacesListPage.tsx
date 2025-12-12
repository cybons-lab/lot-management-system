/**
 * DeliveryPlacesListPage - 納入先マスタ一覧
 */
import { MapPin, Plus } from "lucide-react";

import { DeliveryPlaceForm } from "../components/DeliveryPlaceForm";
import { DeliveryPlacesTable } from "../components/DeliveryPlacesTable";
import { useDeliveryPlacesPageState } from "../hooks/useDeliveryPlacesPageState";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Button, Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function
export function DeliveryPlacesListPage() {
  const {
    // Data
    deliveryPlaces,
    customers,
    sortedData,
    isLoading,
    isError,
    error,
    refetch,

    // Filter/sort
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    showInactive,
    setShowInactive,

    // Dialog state
    isCreateDialogOpen,
    editingItem,
    deletingItem,
    deleteMode,
    restoringItem,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openSoftDeleteDialog,
    openPermanentDeleteDialog,
    closeDeleteDialog,
    switchToPermanentDelete,
    openRestoreDialog,
    closeRestoreDialog,

    // CRUD handlers
    handleCreate,
    handleUpdate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,

    // Mutation states
    isCreating,
    isUpdating,
    isSoftDeleting,
    isPermanentDeleting,
    isRestoring,
  } = useDeliveryPlacesPageState();

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
          <Button size="sm" onClick={openCreateDialog}>
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
          onEdit={openEditDialog}
          onSoftDelete={openSoftDeleteDialog}
          onPermanentDelete={openPermanentDeleteDialog}
          onRestore={openRestoreDialog}
        />
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>納入先新規登録</DialogTitle>
          </DialogHeader>
          <DeliveryPlaceForm
            customers={customers}
            onSubmit={handleCreate}
            onCancel={closeCreateDialog}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>納入先編集</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <DeliveryPlaceForm
              initialData={editingItem}
              customers={customers}
              onSubmit={handleUpdate}
              onCancel={closeEditDialog}
              isSubmitting={isUpdating}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 削除ダイアログ (論理削除) */}
      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        title="納入先を無効化しますか？"
        description={`${deletingItem?.delivery_place_name}（${deletingItem?.delivery_place_code}）を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={switchToPermanentDelete}
      />

      {/* 完全削除ダイアログ (物理削除) */}
      <PermanentDeleteDialog
        open={!!deletingItem && deleteMode === "permanent"}
        onOpenChange={(open: boolean) => !open && closeDeleteDialog()}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
        title="納入先を完全に削除しますか？"
        description={`${deletingItem?.delivery_place_name} を完全に削除します。`}
        confirmationPhrase={deletingItem?.delivery_place_code || "delete"}
      />

      {/* 復元確認ダイアログ */}
      <RestoreDialog
        open={!!restoringItem}
        onOpenChange={(open) => !open && closeRestoreDialog()}
        onConfirm={handleRestore}
        isPending={isRestoring}
        title="納入先を復元しますか？"
        description={`${restoringItem?.delivery_place_name} を有効状態に戻します。`}
      />
    </div>
  );
}
