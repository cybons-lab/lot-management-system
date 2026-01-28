import { ActionButtons } from "../components/ActionButtons";
import { ExportDialog } from "../components/ExportDialog";
import { FilterCard } from "../components/FilterCard";
import { OcrResultsTable } from "../components/OcrResultsTable";
import { StatsDisplay } from "../components/StatsDisplay";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useOcrPageLogic } from "../hooks/useOcrPageLogic";

import { PageHeader } from "@/shared/components/layout/PageHeader";

export function OcrResultsListPage() {
  const { state, setters, actions, contextValue, columns } = useOcrPageLogic();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title={state.viewMode === "current" ? "OCR結果" : "OCR結果（完了済みアーカイブ）"}
          subtitle={
            state.viewMode === "current"
              ? "OCR受注登録で生成されたデータ一覧（リアルタイム）"
              : "処理完了としてアーカイブされたデータ（読み取り専用）"
          }
        />
        <ViewModeToggle
          viewMode={state.viewMode}
          setViewMode={setters.setViewMode}
          setSelectedIds={setters.setSelectedIds}
        />
      </div>

      <ExportDialog
        open={actions.downloadConfirmOpen}
        onOpenChange={actions.setDownloadConfirmOpen}
        onProcess={actions.handleExportProcess}
      />

      <FilterCard
        taskDate={state.taskDate}
        setTaskDate={setters.setTaskDate}
        viewMode={state.viewMode}
        statusFilter={state.statusFilter}
        setStatusFilter={setters.setStatusFilter}
        showErrorsOnly={state.showErrorsOnly}
        setShowErrorsOnly={setters.setShowErrorsOnly}
      />

      <div className="flex justify-between items-center">
        <StatsDisplay
          dataTotal={state.data?.total}
          errorCount={state.errorCount}
          selectedCount={state.selectedIds.length}
        />
        <ActionButtons
          viewMode={state.viewMode}
          selectedIds={state.selectedIds}
          handleManualComplete={actions.handleManualComplete}
          handleManualRestore={actions.handleManualRestore}
          handleExport={actions.handleExport}
          isExporting={actions.isExporting}
          isLoading={state.isLoading}
          completeMutationPending={actions.completeMutation.isPending}
          restoreMutationPending={actions.restoreMutation.isPending}
          handleSapLinkage={actions.handleSapLinkage}
          isRpaStarting={actions.isRpaStarting}
        />
      </div>

      <OcrResultsTable
        viewMode={state.viewMode}
        data={state.data?.items || []}
        columns={columns}
        isLoading={state.isLoading}
        error={state.error}
        selectedIds={state.selectedIds}
        onSelectionChange={setters.setSelectedIds}
        contextValue={contextValue}
        editingRow={state.editingRow}
        onCloseEditModal={() => setters.setEditingRow(null)}
      />
    </div>
  );
}
