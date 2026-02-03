import { ActionButtons } from "../components/ActionButtons";
import { ExportDialog } from "../components/ExportDialog";
import { FilterCard } from "../components/FilterCard";
import { OcrResultsTable } from "../components/OcrResultsTable";
import { StatsDisplay } from "../components/StatsDisplay";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { useOcrPageLogic } from "../hooks/useOcrPageLogic";

import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/display/dropdown-menu";
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[600px] p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">
                  出荷票テキスト置換ルール
                </h3>
                <div className="space-y-4 text-xs">
                  {/* テキスト書き換えタイミング */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-4 bg-blue-500 rounded-full" />
                      テキスト書き換えタイミング
                    </h4>
                    <div className="pl-3 space-y-0.5 text-slate-600">
                      <p>• フィールドから離れた瞬間（フォーカスアウト時）</p>
                      <p>• 数量の +/- ボタンをクリックした直後</p>
                      <p>• ページを開いた際の初期表示時</p>
                    </div>
                  </div>

                  {/* 保存タイミング */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-4 bg-green-500 rounded-full" />
                      保存タイミング
                    </h4>
                    <div className="pl-3 space-y-0.5 text-slate-600">
                      <p>
                        <strong className="text-green-700">自動保存:</strong>{" "}
                        フィールド変更後0.5秒で自動保存
                      </p>
                      <p>
                        <strong className="text-green-700">手動保存:</strong>{" "}
                        「保存」ボタンで明示的に保存可能
                      </p>
                    </div>
                  </div>

                  {/* プレースホルダー一覧 */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-4 bg-purple-500 rounded-full" />
                      プレースホルダー
                    </h4>
                    <div className="pl-3 space-y-1">
                      <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-slate-600">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                          ▲/▲
                        </span>
                        <span>出荷日 (mm/dd) ※納期から輸送LT日数を減算</span>

                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                          ●/●
                        </span>
                        <span>納期 (mm/dd)</span>

                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                          入庫番号
                        </span>
                        <span>入庫番号に置換</span>

                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                          ロット
                        </span>
                        <span>ロット(数量) 形式に置換 ※半角カッコ</span>
                      </div>
                    </div>
                  </div>

                  {/* 数量表記ルール */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-4 bg-orange-500 rounded-full" />
                      数量表記ルール
                    </h4>
                    <div className="pl-3 space-y-0.5 text-slate-600">
                      <p>• 数量がある場合: ロットA(10)/ロットB(20) 形式</p>
                      <p>• 数量が空欄: カッコごと非表示（エラーは出ません）</p>
                      <p>• 複数ロット: スラッシュ(/)で区切り</p>
                    </div>
                  </div>

                  {/* シナリオ別の動作 */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-4 bg-red-500 rounded-full" />
                      シナリオ別の動作
                    </h4>
                    <div className="pl-3 space-y-2 text-slate-600">
                      <div className="bg-slate-50 p-2 rounded border border-slate-300">
                        <p className="font-semibold text-slate-700 mb-1">
                          Case A: テンプレートに「入庫番号」のみの場合
                        </p>
                        <p className="text-[10px] mb-0.5">
                          例: <code className="bg-white px-1 rounded">B911/入庫番号/専/路線</code>
                        </p>
                        <p className="text-[10px]">
                          • 入庫番号のみ → そのまま置換:{" "}
                          <code className="bg-white px-1 rounded">B911/12345/専/路線</code>
                        </p>
                        <p className="text-[10px]">
                          • 入庫番号+数量 → 入庫番号(数量):{" "}
                          <code className="bg-white px-1 rounded">B911/12345(10)/専/路線</code>
                        </p>
                        <p className="text-[10px] text-amber-700">
                          ※
                          ロット番号が入力されていても、テンプレートに「ロット」がないため無視されます
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-300">
                        <p className="font-semibold text-slate-700 mb-1">
                          Case B: テンプレートに「入庫番号」と「ロット」がある場合
                        </p>
                        <p className="text-[10px] mb-0.5">
                          例:{" "}
                          <code className="bg-white px-1 rounded">
                            C697/入庫番号/ロット/専/路線
                          </code>
                        </p>
                        <p className="text-[10px]">• 入庫番号 → 入庫番号（数量なし）</p>
                        <p className="text-[10px]">• ロット → ロット(数量)</p>
                        <p className="text-[10px]">
                          結果:{" "}
                          <code className="bg-white px-1 rounded">
                            C697/12345/Lot123(10)/専/路線
                          </code>
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-300">
                        <p className="font-semibold text-slate-700 mb-1">
                          Case C: テンプレートに「入庫番号(ロット)」形式がある場合
                        </p>
                        <p className="text-[10px] mb-0.5">
                          例:{" "}
                          <code className="bg-white px-1 rounded">* 入庫番号(ロット)/カ/北産</code>
                        </p>
                        <p className="text-[10px]">
                          結果:{" "}
                          <code className="bg-white px-1 rounded">* 12345(Lot123(10))/カ/北産</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ロバストネス */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-4 bg-amber-500 rounded-full" />
                      ロバストネス
                    </h4>
                    <div className="pl-3 space-y-0.5 text-slate-600">
                      <p>• 数量が空欄でもエラーにならない（空文字として扱う）</p>
                      <p>• 日付が空欄の場合もプレースホルダーを削除して処理継続</p>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
          handleDelete={actions.handleDelete}
          handleExport={actions.handleExport}
          isExporting={actions.isExporting}
          isLoading={state.isLoading}
          completeMutationPending={actions.completeMutation.isPending}
          restoreMutationPending={actions.restoreMutation.isPending}
          deleteMutationPending={actions.deleteMutation.isPending}
          handleSapLinkage={actions.handleSapLinkage}
          isRpaStarting={actions.isRpaStarting}
          errorItemCount={
            state.data?.items
              .filter((i) => state.selectedIds.map(Number).includes(i.id))
              .filter((i) => i.has_error).length || 0
          }
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
