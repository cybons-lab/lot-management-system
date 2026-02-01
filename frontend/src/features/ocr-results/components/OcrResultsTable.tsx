/* eslint-disable max-lines-per-function */
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { type OcrResultItem } from "../api";
import { OcrResultEditModal } from "../pages/OcrResultEditModal";
import {
  OcrCellEditingContext,
  OcrInputsContext,
  StatusLegend,
  getRowClassName,
  type EditableFieldKey,
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
  const [activeCell, setActiveCell] = useState<{
    rowId: number;
    field: EditableFieldKey;
  } | null>(null);

  const rowIds = data.map((row) => row.id);
  const rowMap = useMemo(() => new Map(data.map((row) => [row.id, row])), [data]);
  const isReadOnly = viewMode === "completed";

  const editableFieldOrder = useMemo<EditableFieldKey[]>(() => {
    if (isReadOnly) return [];
    const columnIds = new Set(columns.map((col) => col.id));
    const order: EditableFieldKey[] = [];
    if (columnIds.has("lot_info")) {
      order.push("lotNo1", "inboundNo1", "quantity1", "lotNo2", "inboundNo2", "quantity2");
    }
    if (columnIds.has("shipping_date_input")) {
      order.push("shippingDate");
    }
    if (columnIds.has("shipping_slip_text_input")) {
      order.push("shippingSlipText");
    }
    if (columnIds.has("material_code")) {
      order.push("materialCode");
    }
    if (columnIds.has("jiku_code")) {
      order.push("jikuCode");
    }
    if (columnIds.has("delivery_date")) {
      order.push("deliveryDate");
    }
    if (columnIds.has("delivery_quantity")) {
      order.push("deliveryQuantity");
    }
    return order;
  }, [columns, isReadOnly]);

  useEffect(() => {
    if (!activeCell) return;
    if (isReadOnly) {
      setActiveCell(null);
      return;
    }
    if (!rowMap.has(activeCell.rowId)) {
      setActiveCell(null);
      return;
    }
  }, [activeCell, isReadOnly, rowMap]);

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-[var(--shadow-soft)]",
          viewMode === "completed" && "bg-[hsl(var(--surface-2))]",
        )}
      >
        <CardContent className="p-0">
          <OcrInputsContext.Provider value={contextValue}>
            <OcrCellEditingContext.Provider
              value={{
                activeCell,
                setActiveCell,
                editableFieldOrder,
                rowIds,
                isReadOnly,
                getRowById: (rowId) => rowMap.get(rowId),
              }}
            >
              {viewMode === "completed" && (
                <div className="px-5 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] flex items-center gap-2">
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
                  dense={true}
                  striped={true}
                />
              )}
              <OcrResultEditModal
                row={editingRow}
                isOpen={!!editingRow}
                onClose={onCloseEditModal}
              />
            </OcrCellEditingContext.Provider>
          </OcrInputsContext.Provider>
        </CardContent>
      </Card>

      {/* ステータス凡例をテーブル下に配置 */}
      {viewMode === "current" && (
        <div className="px-5 py-4 rounded-xl bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] shadow-[var(--shadow-soft)]">
          <StatusLegend />
        </div>
      )}
    </div>
  );
}
