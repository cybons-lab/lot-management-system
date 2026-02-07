/**
 * UomConversionsPage - 単位換算マスタページ
 */
import { UomConversionBulkImportDialog } from "../components/UomConversionBulkImportDialog";
import { UomConversionCreateDialog } from "../components/UomConversionCreateDialog";
import { UomConversionsDeleteRestoreDialogs } from "../components/UomConversionsDeleteRestoreDialogs";
import { UomConversionsFilter } from "../components/UomConversionsFilter";
import { UomConversionsPageHeader } from "../components/UomConversionsPageHeader";
import { UomConversionsTable } from "../components/UomConversionsTable";
import { useUomConversionsPageState } from "../hooks";

import { SupplierAssignmentWarning } from "@/features/assignments/components";

export function UomConversionsPage() {
  const state = useUomConversionsPageState();

  if (state.isLoading) return <div className="p-6">読み込み中...</div>;

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* 担当仕入先未設定警告 */}
      <SupplierAssignmentWarning />

      <UomConversionsPageHeader
        onImportClick={state.openImportDialog}
        onCreateClick={state.openCreateDialog}
      />

      <UomConversionsFilter
        suppliers={state.suppliers}
        selectedSupplierId={state.selectedSupplierId}
        onSelectedSupplierIdChange={state.setSelectedSupplierId}
        showInactive={state.showInactive}
        onShowInactiveChange={state.setShowInactive}
        displayCount={state.filteredConversions.length}
        totalCount={state.conversions.length}
      />

      <UomConversionsTable
        conversions={state.filteredConversions}
        editingId={state.inlineEdit.editingId}
        editValue={state.inlineEdit.editValue}
        setEditValue={state.inlineEdit.setEditValue}
        isUpdating={state.inlineEdit.isUpdating}
        handleSaveEdit={state.inlineEdit.handleSaveEdit}
        handleCancelEdit={state.inlineEdit.handleCancelEdit}
        handleStartEdit={state.inlineEdit.handleStartEdit}
        handleSoftDelete={state.openSoftDeleteDialog}
        handlePermanentDelete={state.openPermanentDeleteDialog}
        handleRestore={state.openRestoreDialog}
        isLoading={state.isLoading}
      />

      <div className="text-sm text-slate-600">{state.filteredConversions.length} 件の単位換算</div>

      <UomConversionBulkImportDialog
        open={state.isImportDialogOpen}
        onOpenChange={(open) => !open && state.closeImportDialog()}
      />

      <UomConversionCreateDialog
        open={state.isCreateDialogOpen}
        onOpenChange={(open) => !open && state.closeCreateDialog()}
        products={state.products}
        suppliers={state.suppliers}
        onSubmit={state.handleCreate}
        isSubmitting={state.isCreating}
      />

      <UomConversionsDeleteRestoreDialogs
        deletingItem={state.deletingItem}
        deleteMode={state.deleteMode}
        restoringItem={state.restoringItem}
        onCloseDeleteDialog={state.closeDeleteDialog}
        onCloseRestoreDialog={state.closeRestoreDialog}
        onSwitchToPermanent={state.switchToPermanentDelete}
        onSoftDelete={state.handleSoftDelete}
        onPermanentDelete={state.handlePermanentDelete}
        onRestore={state.handleRestore}
        isSoftDeleting={state.isSoftDeleting}
        isPermanentDeleting={state.isPermanentDeleting}
        isRestoring={state.isRestoring}
      />
    </div>
  );
}
