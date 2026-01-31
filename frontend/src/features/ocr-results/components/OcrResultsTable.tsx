import { AlertCircle } from "lucide-react";

import { type OcrResultItem } from "../api";
import { OcrResultEditModal } from "../pages/OcrResultEditModal";
import {
  OcrInputsContext,
  StatusLegend,
  getRowClassName,
  type RowInputState,
} from "../pages/OcrResultsTableCells";

import { Card, CardContent } from "@/components/ui";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { cn } from "@/shared/libs/utils";

interface OcrResultsTableProps {
  viewMode: "current" | "completed";
  data: OcrResultItem[];
  columns: Column<OcrResultItem>[];
  isLoading: boolean;
  error: Error | null;
  selectedIds: (string | number)[];
  onSelectionChange: (ids: (string | number)[]) => void;
  contextValue: {
    getInputs: (row: OcrResultItem) => RowInputState;
    updateInputs: (row: OcrResultItem, patch: Partial<RowInputState>) => void;
  };
  editingRow: OcrResultItem | null;
  onCloseEditModal: () => void;
}

export function OcrResultsTable({
  viewMode,
  data,
  columns,
  isLoading,
  error,
  selectedIds,
  onSelectionChange,
  contextValue,
  editingRow,
  onCloseEditModal,
}: OcrResultsTableProps) {
  return (
    <div className="space-y-4">
      <Card className={cn(viewMode === "completed" && "bg-slate-50 border-slate-300")}>
        <CardContent className="p-0">
          <OcrInputsContext.Provider value={contextValue}>
            {viewMode === "completed" && (
              <div className="px-4 py-2 border-b bg-slate-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">アーカイブデータ閲覧中</span>
              </div>
            )}

            {error ? (
              <div className="p-8 text-center text-destructive">
                エラーが発生しました: {error instanceof Error ? error.message : "不明なエラー"}
              </div>
            ) : (
              <DataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="OCR結果データがありません"
                enableVirtualization
                getRowClassName={getRowClassName}
                selectable={true}
                selectedIds={selectedIds}
                onSelectionChange={onSelectionChange}
                isRowSelectable={(row) => row.status !== "processing"}
              />
            )}
            <OcrResultEditModal row={editingRow} isOpen={!!editingRow} onClose={onCloseEditModal} />
          </OcrInputsContext.Provider>
        </CardContent>
      </Card>

      {/* ステータス凡例をテーブル下に配置 */}
      {viewMode === "current" && (
        <div className="px-4 py-3 rounded-lg bg-gray-50/50 border border-gray-200">
          <StatusLegend />
        </div>
      )}
    </div>
  );
}
