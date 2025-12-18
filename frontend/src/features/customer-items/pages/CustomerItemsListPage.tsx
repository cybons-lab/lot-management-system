/**
 * CustomerItemsListPage - Refactored
 * 得意先品番マッピング一覧ページ
 * useListPageDialogsを使用してダイアログ状態を管理
 */
import { Package, Plus, Upload } from "lucide-react";
import { useState } from "react";

import type { CustomerItem } from "../api";
import { CustomerItemBulkImportDialog } from "../components/CustomerItemBulkImportDialog";
import { CustomerItemDetailDialog } from "../components/CustomerItemDetailDialog";
import { CustomerItemExportButton } from "../components/CustomerItemExportButton";
import { CustomerItemForm } from "../components/CustomerItemForm";
import { CustomerItemsFilter } from "../components/CustomerItemsFilter";
import { CustomerItemsTable } from "../components/CustomerItemsTable";
import { useCustomerItemsPage } from "../hooks/useCustomerItemsPage";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Button, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useListPageDialogs } from "@/hooks/ui";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function CustomerItemsListPage() {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showInactive,
    setShowInactive,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    filteredItems,
    isLoading,
    isCreating,
    stats,
    handleCreate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
    isSoftDeleting,
    isPermanentDeleting,
    isRestoring,
  } = useCustomerItemsPage();

  // 詳細ダイアログ用（独自管理）
  const [selectedItem, setSelectedItem] = useState<CustomerItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // 削除/復元ダイアログ用
  const {
    isSoftDeleteOpen,
    isPermanentDeleteOpen,
    isRestoreOpen,
    deletingItem,
    restoringItem,
    openSoftDelete,
    openPermanentDelete,
    openRestore,
    close: closeDeleteDialog,
    switchToPermanentDelete,
  } = useListPageDialogs<CustomerItem>();

  const handleRowClick = (item: CustomerItem) => {
    setSelectedItem(item);
    setIsDetailDialogOpen(true);
  };

  const executeSoftDelete = (endDate: string | null) => {
    if (!deletingItem) return;
    handleSoftDelete(
      deletingItem.customer_id,
      deletingItem.external_product_code,
      endDate || undefined,
    );
    closeDeleteDialog();
  };

  const executePermanentDelete = () => {
    if (!deletingItem) return;
    handlePermanentDelete(deletingItem.customer_id, deletingItem.external_product_code);
    closeDeleteDialog();
  };

  const executeRestore = () => {
    if (!restoringItem) return;
    handleRestore(restoringItem.customer_id, restoringItem.external_product_code);
    closeDeleteDialog();
  };

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="得意先品番マッピング"
        subtitle="得意先品番と製品の紐付け管理"
        actions={
          <div className="flex gap-2">
            <CustomerItemExportButton size="sm" />
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
      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-blue-100 p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">登録マッピング数</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <CustomerItemsFilter
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
        <div className="flex items-center space-x-2 pt-4">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(c) => setShowInactive(!!c)}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer">
            削除済みを表示
          </Label>
        </div>
      </div>

      <CustomerItemsTable
        items={filteredItems}
        isLoading={isLoading}
        onSoftDelete={openSoftDelete}
        onPermanentDelete={openPermanentDelete}
        onRestore={openRestore}
        onRowClick={handleRowClick}
      />

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>得意先品番マッピング新規登録</DialogTitle>
          </DialogHeader>
          <CustomerItemForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* インポートダイアログ */}
      <CustomerItemBulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      {/* 詳細ダイアログ */}
      <CustomerItemDetailDialog
        item={selectedItem}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />

      {/* Delete/Restore Dialogs */}
      <SoftDeleteDialog
        open={isSoftDeleteOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        title="マッピングを無効化しますか？"
        description={`${deletingItem?.customer_name} - ${deletingItem?.product_name} の設定を無効化します。`}
        onConfirm={executeSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={switchToPermanentDelete}
      />

      <PermanentDeleteDialog
        open={isPermanentDeleteOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        onConfirm={executePermanentDelete}
        isPending={isPermanentDeleting}
        title="マッピングを完全に削除しますか？"
        description={`${deletingItem?.customer_name} - ${deletingItem?.product_name} の設定を完全に削除します。この操作は取り消せません。`}
        confirmationPhrase={deletingItem?.external_product_code || "delete"}
      />

      <RestoreDialog
        open={isRestoreOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        onConfirm={executeRestore}
        isPending={isRestoring}
        title="設定を復元しますか？"
        description={`${restoringItem?.customer_name} - ${restoringItem?.product_name} の設定を有効状態に戻します。`}
      />
    </div>
  );
}
