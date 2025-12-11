/**
 * CustomerItemsListPage - Refactored
 * 得意先品番マッピング一覧ページ
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

import { SoftDeleteDialog, PermanentDeleteDialog } from "@/components/common";
import { Button, Checkbox } from "@/components/ui";
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

  const [selectedItem, setSelectedItem] = useState<CustomerItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Delete/Restore state
  const [deletingItem, setDeletingItem] = useState<CustomerItem | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "permanent">("soft");
  const [restoringItem, setRestoringItem] = useState<CustomerItem | null>(null);

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
    setDeletingItem(null);
  };

  const executePermanentDelete = () => {
    if (!deletingItem) return;
    handlePermanentDelete(deletingItem.customer_id, deletingItem.external_product_code);
    setDeletingItem(null);
  };

  const executeRestore = () => {
    if (!restoringItem) return;
    handleRestore(restoringItem.customer_id, restoringItem.external_product_code);
    setRestoringItem(null);
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
        onSoftDelete={(item) => {
          setDeletingItem(item);
          setDeleteMode("soft");
        }}
        onPermanentDelete={(item) => {
          setDeletingItem(item);
          setDeleteMode("permanent");
        }}
        onRestore={setRestoringItem}
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
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="マッピングを無効化しますか？"
        description={`${deletingItem?.customer_name} - ${deletingItem?.product_name} の設定を無効化します。`}
        onConfirm={executeSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={() => setDeleteMode("permanent")}
      />

      <PermanentDeleteDialog
        open={!!deletingItem && deleteMode === "permanent"}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeletingItem(null);
            setDeleteMode("soft");
          }
        }}
        onConfirm={executePermanentDelete}
        isPending={isPermanentDeleting}
        title="マッピングを完全に削除しますか？"
        description={`${deletingItem?.customer_name} - ${deletingItem?.product_name} の設定を完全に削除します。この操作は取り消せません。`}
        confirmationPhrase={deletingItem?.external_product_code || "delete"}
      />

      <AlertDialog
        open={!!restoringItem}
        onOpenChange={(open: boolean) => !open && setRestoringItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>設定を復元しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {restoringItem?.customer_name} - {restoringItem?.product_name}{" "}
              の設定を有効状態に戻します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={executeRestore} disabled={isRestoring}>
              {isRestoring ? "復元中..." : "復元"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
