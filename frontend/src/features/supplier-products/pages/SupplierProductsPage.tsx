/**
 * SupplierProductsPage - 仕入先商品詳細・一覧
 */
import { Package } from "lucide-react";

import { SupplierProductForm } from "../components/SupplierProductForm";
import { SupplierProductsTable } from "../components/SupplierProductsTable";
import { useSupplierProductsPageState } from "../hooks/useSupplierProductsPageState";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function, complexity
export function SupplierProductsPage() {
  const {
    supplierProducts,
    products,
    suppliers,
    paginatedData,
    table,
    totalCount,
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
    isImportDialogOpen,
    isCreateDialogOpen,
    editingItem,
    deletingItem,
    deleteMode,
    restoringItem,
    openCreateDialog,
    closeCreateDialog,
    openImportDialog,
    closeImportDialog,
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
  } = useSupplierProductsPageState();

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader title="仕入先商品" subtitle="仕入先別の商品情報を管理します" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="仕入先別製品設定"
        subtitle="仕入先別の製品情報を管理します"
        actions={
          <MasterPageActions
            exportApiPath="masters/supplier-products/export/download"
            exportFilePrefix="supplier_products"
            onImportClick={openImportDialog}
            onCreateClick={openCreateDialog}
            size="sm"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-orange-50 p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-orange-600">登録件数</p>
              <p className="text-2xl font-bold text-orange-700">{supplierProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">仕入先商品一覧</h3>
          <div className="flex items-center space-x-4">
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
              placeholder="商品・仕入先で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
        <SupplierProductsTable
          products={products}
          suppliers={suppliers}
          supplierProducts={paginatedData}
          isLoading={isLoading}
          sort={sort}
          onSortChange={setSort}
          onEdit={openEditDialog}
          onSoftDelete={openSoftDeleteDialog}
          onPermanentDelete={openPermanentDeleteDialog}
          onRestore={openRestoreDialog}
        />
        {totalCount > 0 && (
          <TablePagination
            currentPage={table.calculatePagination(totalCount).page ?? 1}
            pageSize={table.calculatePagination(totalCount).pageSize ?? 25}
            totalCount={totalCount}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            pageSizeOptions={[25, 50, 100]}
          />
        )}
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>仕入先商品登録</DialogTitle>
          </DialogHeader>
          <SupplierProductForm
            products={products}
            suppliers={suppliers}
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
            <DialogTitle>仕入先商品編集</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <SupplierProductForm
              initialData={editingItem}
              products={products}
              suppliers={suppliers}
              onSubmit={handleUpdate}
              onCancel={closeEditDialog}
              isSubmitting={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        title="仕入先商品設定を無効化しますか？"
        description={`${deletingItem?.product_name || "商品"} - ${deletingItem?.supplier_name || "仕入先"} の関連を無効化します。`}
        onConfirm={handleSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={switchToPermanentDelete}
      />

      <PermanentDeleteDialog
        open={!!deletingItem && deleteMode === "permanent"}
        onOpenChange={(open: boolean) => !open && closeDeleteDialog()}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
        title="仕入先商品設定を完全に削除しますか？"
        description={`${deletingItem?.product_name || "商品"} - ${deletingItem?.supplier_name || "仕入先"} の関連を完全に削除します。`}
        confirmationPhrase={deletingItem?.product_code || "delete"}
      />

      <RestoreDialog
        open={!!restoringItem}
        onOpenChange={(open) => !open && closeRestoreDialog()}
        onConfirm={handleRestore}
        isPending={isRestoring}
        title="設定を復元しますか？"
        description={`${restoringItem?.product_name} - ${restoringItem?.supplier_name} の関連を有効状態に戻します。`}
      />

      <MasterImportDialog
        open={isImportDialogOpen}
        onOpenChange={(open) => !open && closeImportDialog()}
        title="仕入先商品 インポート"
        group="supply"
      />
    </div>
  );
}
