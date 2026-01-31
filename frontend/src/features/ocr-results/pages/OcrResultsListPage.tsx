import { ActionButtons } from "../components/ActionButtons";
import { ExportDialog } from "../components/ExportDialog";
import { FilterCard } from "../components/FilterCard";
import { OcrResultsTable } from "../components/OcrResultsTable";
import { StatsDisplay } from "../components/StatsDisplay";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useOcrPageLogic } from "../hooks/useOcrPageLogic";

import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function -- ページレイアウトの論理的なまとまり
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

      {/* フィルタ + 変換ルール + データ件数 + アクションボタンを同じ行に配置 */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterCard
            taskDate={state.taskDate}
            setTaskDate={setters.setTaskDate}
            viewMode={state.viewMode}
            statusFilter={state.statusFilter}
            setStatusFilter={setters.setStatusFilter}
            showErrorsOnly={state.showErrorsOnly}
            setShowErrorsOnly={setters.setShowErrorsOnly}
          />
          {/* 出荷票テキスト置換ルールをフィルタの隣に配置 */}
          {state.viewMode === "current" && (
            <details className="group inline-block">
              <summary className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors list-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>変換ルール</span>
              </summary>
              <div className="absolute z-50 mt-2 w-[500px] rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <h3 className="text-sm font-bold text-slate-700 mb-2">出荷票テキスト置換ルール</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div>
                    <strong>テキスト書き換え:</strong>{" "}
                    フィールドから離れた瞬間、数量ボタンクリック時、ページ読み込み時
                  </div>
                  <div>
                    <strong>自動保存:</strong> フィールド変更後0.5秒で自動保存
                  </div>
                  <div>
                    <strong>プレースホルダー:</strong> ▲/▲(出荷日)、●/●(納期)、入庫番号、ロット
                  </div>
                  <div>
                    <strong>数量表記:</strong> ロット(数量) 形式、数量が空欄の場合はカッコごと非表示
                  </div>
                </div>
              </div>
            </details>
          )}
          {/* データ件数表示 */}
          <StatsDisplay
            dataTotal={state.data?.total}
            errorCount={state.errorCount}
            selectedCount={state.selectedIds.length}
          />
        </div>
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
