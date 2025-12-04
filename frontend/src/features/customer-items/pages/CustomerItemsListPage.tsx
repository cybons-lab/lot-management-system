/**
 * CustomerItemsListPage - Refactored
 * 得意先品番マッピング一覧ページ
 */
import { Package, Plus, Upload } from "lucide-react";

import { CustomerItemBulkImportDialog } from "../components/CustomerItemBulkImportDialog";
import { CustomerItemExportButton } from "../components/CustomerItemExportButton";
import { CustomerItemForm } from "../components/CustomerItemForm";
import { CustomerItemsFilter } from "../components/CustomerItemsFilter";
import { CustomerItemsTable } from "../components/CustomerItemsTable";
import { useCustomerItemsPage } from "../hooks/useCustomerItemsPage";

import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function CustomerItemsListPage() {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    filteredItems,
    isLoading,
    isCreating,
    isDeleting,
    stats,
    handleCreate,
    handleDelete,
  } = useCustomerItemsPage();

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

      <CustomerItemsFilter
        filters={filters}
        setFilters={setFilters}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <CustomerItemsTable
        items={filteredItems}
        isLoading={isLoading}
        isDeleting={isDeleting}
        onDelete={handleDelete}
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
    </div>
  );
}
