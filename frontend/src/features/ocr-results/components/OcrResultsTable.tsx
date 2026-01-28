import { type ColumnDef } from "@tanstack/react-table";

import { type OcrResultItem } from "../api";
import { OcrResultEditModal } from "../pages/OcrResultEditModal";
import {
  OcrInputsContext,
  StatusLegend,
  getRowClassName,
  type RowInputState,
} from "../pages/OcrResultsTableCells";

import { Card, CardContent } from "@/components/ui";
import { DataTable } from "@/shared/components/data/DataTable";
import { cn } from "@/shared/libs/utils";


interface OcrResultsTableProps {
  viewMode: "current" | "completed";
  data: OcrResultItem[];
  columns: ColumnDef<OcrResultItem, any>[];
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
    <Card className={cn(viewMode === "completed" && "bg-slate-50 border-slate-300")}>
      <CardContent className="p-0">
        <OcrInputsContext.Provider value={contextValue}>
          {viewMode === "current" && (
            <div className="px-4 pt-4 pb-2 border-b bg-gray-50/50">
              <StatusLegend />
            </div>
          )}
          {viewMode === "completed" && (
            <div className="px-4 py-2 border-b bg-slate-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">アーカイブデータ閲覧中</span>
            </div>
          )}

          {error ? (
            <div className="p-8 text-center text-destructive">
              エラーが発生しました: {(error as any).message}
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
            />
          )}
          <OcrResultEditModal row={editingRow} isOpen={!!editingRow} onClose={onCloseEditModal} />
        </OcrInputsContext.Provider>
      </CardContent>
    </Card>
  );
}
