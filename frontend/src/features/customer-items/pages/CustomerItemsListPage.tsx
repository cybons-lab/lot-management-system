/**
 * CustomerItemsListPage - Refactored
 * 得意先品番マッピング一覧ページ
 * useListPageDialogsを使用してダイアログ状態を管理
 * 一括削除機能対応版
 */
import { Package, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { CustomerItem, UpdateCustomerItemRequest } from "../api";
import { CustomerItemBulkImportDialog } from "../components/CustomerItemBulkImportDialog";
import { CustomerItemDetailDialog } from "../components/CustomerItemDetailDialog";
import { CustomerItemExportButton } from "../components/CustomerItemExportButton";
import { CustomerItemForm } from "../components/CustomerItemForm";
import { CustomerItemsFilter } from "../components/CustomerItemsFilter";
import { CustomerItemsTable } from "../components/CustomerItemsTable";
import { useUpdateCustomerItem } from "../hooks";
import { useCustomerItemsPage } from "../hooks/useCustomerItemsPage";

import {
  SoftDeleteDialog,
  PermanentDeleteDialog,
  RestoreDialog,
  BulkPermanentDeleteDialog,
  BulkSoftDeleteDialog,
} from "@/components/common";
import { Button, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useAuth } from "@/features/auth/AuthContext";
import { useListPageDialogs } from "@/hooks/ui";
import { PageHeader } from "@/shared/components/layout/PageHeader";

/** CustomerItem用の一意キー生成 */
const getItemKey = (item: CustomerItem) => `${item.customer_id}-${item.external_product_code}`;

/** キーをパース */
const parseItemKey = (key: string) => {
  const [customerIdStr, ...rest] = key.split("-");
  return {
    customer_id: Number(customerIdStr),
    external_product_code: rest.join("-"),
  };
};

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
    handleBulkPermanentDelete,
    handleBulkSoftDelete,
    isSoftDeleting,
    isPermanentDeleting,
    isRestoring,
    isBulkDeleting,
  } = useCustomerItemsPage();

  // 管理者権限チェック
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;

  // 詳細ダイアログ用（独自管理）
  const [selectedItem, setSelectedItem] = useState<CustomerItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // 編集ダイアログ用
  const [editingItem, setEditingItem] = useState<CustomerItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { mutate: updateCustomerItem, isPending: isUpdating } = useUpdateCustomerItem();

  // 選択機能（管理者は全アイテム、非管理者はアクティブのみ）
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

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

  const handleEdit = (item: CustomerItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: UpdateCustomerItemRequest) => {
    if (!editingItem) return;
    updateCustomerItem(
      {
        customerId: editingItem.customer_id,
        externalProductCode: editingItem.external_product_code,
        data,
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingItem(null);
          toast.success("得意先品番マッピングを更新しました");
        },
        onError: (error) => {
          toast.error(`更新に失敗しました: ${error.message}`);
        },
      },
    );
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

  // 選択関連ハンドラ
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    // 管理者は全アイテム、非管理者はアクティブなアイテムのみ選択可能
    const selectableItems = isAdmin
      ? filteredItems
      : filteredItems.filter(
          (item) => !item.valid_to || item.valid_to > new Date().toISOString().split("T")[0],
        );
    const allKeys = selectableItems.map((item) => getItemKey(item));
    const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedIds.has(key));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allKeys));
    }
  }, [filteredItems, selectedIds, isAdmin]);

  // 管理者: 一括物理削除
  const executeBulkPermanentDelete = async () => {
    const keys = Array.from(selectedIds) as string[];
    const items = keys.map(parseItemKey);
    await handleBulkPermanentDelete(items);
    setSelectedIds(new Set());
    setIsBulkDeleteDialogOpen(false);
  };

  // 非管理者: 一括論理削除
  const executeBulkSoftDelete = async (endDate: string | null) => {
    const keys = Array.from(selectedIds) as string[];
    const items = keys.map(parseItemKey);
    await handleBulkSoftDelete(items, endDate ?? undefined);
    setSelectedIds(new Set());
    setIsBulkDeleteDialogOpen(false);
  };

  const selectedCount = selectedIds.size;

  // チェックボックス表示条件: 管理者は常に、非管理者も常に（論理削除用）
  const showCheckboxes = true;

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="得意先品番マッピング"
        subtitle="得意先品番と製品の紐付け管理"
        backLink={{ to: "/masters", label: "マスタ管理" }}
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

      {/* 一括操作バー */}
      {showCheckboxes && selectedCount > 0 && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 ${
            isAdmin ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <span className={`text-sm font-medium ${isAdmin ? "text-red-800" : "text-amber-800"}`}>
            {selectedCount} 件選択中
          </span>
          <Button
            variant={isAdmin ? "destructive" : "outline"}
            size="sm"
            onClick={() => setIsBulkDeleteDialogOpen(true)}
            className={!isAdmin ? "border-amber-600 text-amber-700 hover:bg-amber-100" : ""}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isAdmin ? "一括削除" : "一括無効化"}
          </Button>
        </div>
      )}

      <CustomerItemsTable
        items={filteredItems}
        isLoading={isLoading}
        onEdit={handleEdit}
        onSoftDelete={openSoftDelete}
        onPermanentDelete={openPermanentDelete}
        onRestore={openRestore}
        onRowClick={handleRowClick}
        selectedIds={showCheckboxes ? selectedIds : undefined}
        onToggleSelect={showCheckboxes ? handleToggleSelect : undefined}
        onToggleSelectAll={showCheckboxes ? handleToggleSelectAll : undefined}
        isAdmin={isAdmin}
      />

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
        onEdit={handleEdit}
      />

      {/* 編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>得意先品番マッピング編集</DialogTitle>
          </DialogHeader>
          <CustomerItemForm
            item={editingItem ?? undefined}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={isUpdating}
          />
        </DialogContent>
      </Dialog>

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

      {/* 一括削除ダイアログ（管理者: 物理削除、非管理者: 論理削除） */}
      {isAdmin ? (
        <BulkPermanentDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          selectedCount={selectedCount}
          onConfirm={executeBulkPermanentDelete}
          isPending={isBulkDeleting}
          title="選択したマッピングを完全に削除しますか？"
          description={`選択された ${selectedCount} 件の得意先品番マッピングを完全に削除します。`}
        />
      ) : (
        <BulkSoftDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          selectedCount={selectedCount}
          onConfirm={executeBulkSoftDelete}
          isPending={isBulkDeleting}
          title="選択したマッピングを無効化しますか？"
          description={`選択された ${selectedCount} 件の得意先品番マッピングを無効化します。`}
        />
      )}
    </div>
  );
}
