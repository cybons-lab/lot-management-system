/**
 * OCR結果一覧ページ（v_ocr_resultsビューベース）
 */

import { useMemo, useState } from "react";

import { type OcrResultItem } from "../api";
import { ActionButtons } from "../components/ActionButtons";
import { ExportDialog } from "../components/ExportDialog";
import { FilterCard } from "../components/FilterCard";
import { OcrResultsTable } from "../components/OcrResultsTable";
import { StatsDisplay } from "../components/StatsDisplay";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useOcrActions } from "../hooks/useOcrActions";
import { useOcrData } from "../hooks/useOcrData";
import { useOcrRowInputs } from "../hooks/useOcrRowInputs";

import { useOcrColumns } from "./useOcrColumns";

import { PageHeader } from "@/shared/components/layout/PageHeader";

export function OcrResultsListPage() {
  const [viewMode, setViewMode] = useState<"current" | "completed">("current");
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [taskDate, setTaskDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [editingRow, setEditingRow] = useState<OcrResultItem | null>(null);

  const { data, isLoading, error, errorCount } = useOcrData(
    taskDate,
    statusFilter,
    showErrorsOnly,
    viewMode,
  );

  const { getInputs, updateInputs, flushPendingEdits } = useOcrRowInputs(
    viewMode,
    data?.items || [],
  );

  const {
    downloadConfirmOpen,
    setDownloadConfirmOpen,
    isExporting,
    handleExport,
    handleExportProcess,
    handleManualComplete,
    handleManualRestore,
    completeMutation,
    restoreMutation,
  } = useOcrActions({
    viewMode,
    selectedIds,
    setSelectedIds,
    dataItems: data?.items || [],
    flushPendingEdits,
    taskDate,
    statusFilter,
    showErrorsOnly,
  });

  const contextValue = useMemo(() => ({ getInputs, updateInputs }), [getInputs, updateInputs]);
  const isReadOnly = viewMode === "completed";
  const columns = useOcrColumns(isReadOnly, setEditingRow);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title={viewMode === "current" ? "OCR結果" : "OCR結果（完了済みアーカイブ）"}
          subtitle={
            viewMode === "current"
              ? "OCR受注登録で生成されたデータ一覧（リアルタイム）"
              : "処理完了としてアーカイブされたデータ（読み取り専用）"
          }
        />
        <ViewModeToggle
          viewMode={viewMode}
          setViewMode={setViewMode}
          setSelectedIds={setSelectedIds}
        />
      </div>

      <ExportDialog
        open={downloadConfirmOpen}
        onOpenChange={setDownloadConfirmOpen}
        onProcess={handleExportProcess}
      />

      <FilterCard
        taskDate={taskDate}
        setTaskDate={setTaskDate}
        viewMode={viewMode}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showErrorsOnly={showErrorsOnly}
        setShowErrorsOnly={setShowErrorsOnly}
      />

      <div className="flex justify-between items-center">
        <StatsDisplay
          dataTotal={data?.total}
          errorCount={errorCount}
          selectedCount={selectedIds.length}
        />
        <ActionButtons
          viewMode={viewMode}
          selectedIds={selectedIds}
          handleManualComplete={handleManualComplete}
          handleManualRestore={handleManualRestore}
          handleExport={handleExport}
          isExporting={isExporting}
          isLoading={isLoading}
          completeMutationPending={completeMutation.isPending}
          restoreMutationPending={restoreMutation.isPending}
        />
      </div>

      <OcrResultsTable
        viewMode={viewMode}
        data={data?.items || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        contextValue={contextValue}
        editingRow={editingRow}
        onCloseEditModal={() => setEditingRow(null)}
      />
    </div>
  );
}
