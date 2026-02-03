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
} from "../pages/OcrResultsTableCells";
import { type RowInputState } from "../utils/ocr-utils";

import { DataTable, type Column } from "@/shared/components/data/DataTable";

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
    // ユーザー指定の順序: ロット1 -> 入庫1 -> 数量1 -> ロット2 -> 入庫2 -> 数量2
    if (columnIds.has("lot_no") || columnIds.has("inbound_no") || columnIds.has("quantity")) {
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
      {viewMode === "completed" && (
        <div className="px-5 py-3 border border-b-0 border-[hsl(var(--border))] rounded-t-xl bg-[hsl(var(--surface-2))] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">アーカイブデータ閲覧中</span>
        </div>
      )}

      {error ? (
        <div className="p-8 text-center text-destructive border rounded-xl bg-white">
          エラーが発生しました: {error instanceof Error ? error.message : "不明なエラー"}
        </div>
      ) : (
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
            <OcrResultEditModal row={editingRow} isOpen={!!editingRow} onClose={onCloseEditModal} />
          </OcrCellEditingContext.Provider>
        </OcrInputsContext.Provider>
      )}

      {/* ステータス凡例をテーブル下に配置 */}
      {viewMode === "current" && <StatusLegend />}
    </div>
  );
}
