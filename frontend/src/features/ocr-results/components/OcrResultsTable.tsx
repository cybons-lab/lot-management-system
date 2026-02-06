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

interface ActiveCellState {
  rowId: number;
  field: EditableFieldKey;
}

function buildEditableFieldOrder(
  columns: Column<OcrResultItem>[],
  isReadOnly: boolean,
): EditableFieldKey[] {
  if (isReadOnly) return [];

  const columnIds = new Set(columns.map((column) => column.id));
  const order: EditableFieldKey[] = [];

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
}

function CompletedModeBanner() {
  return (
    <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-5 py-3">
      <AlertCircle className="h-4 w-4 text-slate-500" />
      <span className="text-sm font-medium text-slate-700">アーカイブデータ閲覧中</span>
    </div>
  );
}

function ErrorPanel({ error }: { error: Error | null }) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center text-destructive">
      エラーが発生しました: {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}

interface OcrTableContentProps {
  data: OcrResultItem[];
  columns: Column<OcrResultItem>[];
  isLoading: boolean;
  selectedIds: (string | number)[];
  onSelectionChange: (ids: (string | number)[]) => void;
  contextValue: {
    getInputs: (row: OcrResultItem) => RowInputState;
    updateInputs: (row: OcrResultItem, patch: Partial<RowInputState>) => void;
  };
  activeCell: ActiveCellState | null;
  setActiveCell: (next: ActiveCellState | null) => void;
  editableFieldOrder: EditableFieldKey[];
  rowIds: number[];
  rowMap: Map<number, OcrResultItem>;
  isReadOnly: boolean;
  editingRow: OcrResultItem | null;
  onCloseEditModal: () => void;
}

function OcrTableContent({
  data,
  columns,
  isLoading,
  selectedIds,
  onSelectionChange,
  contextValue,
  activeCell,
  setActiveCell,
  editableFieldOrder,
  rowIds,
  rowMap,
  isReadOnly,
  editingRow,
  onCloseEditModal,
}: OcrTableContentProps) {
  return (
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
  );
}

function useActiveCellGuard(params: {
  activeCell: ActiveCellState | null;
  isReadOnly: boolean;
  rowMap: Map<number, OcrResultItem>;
  setActiveCell: (next: ActiveCellState | null) => void;
}) {
  const { activeCell, isReadOnly, rowMap, setActiveCell } = params;

  useEffect(() => {
    if (!activeCell) return;
    if (isReadOnly || !rowMap.has(activeCell.rowId)) {
      setActiveCell(null);
    }
  }, [activeCell, isReadOnly, rowMap, setActiveCell]);
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
  const [activeCell, setActiveCell] = useState<ActiveCellState | null>(null);

  const rowIds = data.map((row) => row.id);
  const rowMap = useMemo(() => new Map(data.map((row) => [row.id, row])), [data]);
  const isReadOnly = viewMode === "completed";
  const editableFieldOrder = useMemo(
    () => buildEditableFieldOrder(columns, isReadOnly),
    [columns, isReadOnly],
  );

  useActiveCellGuard({ activeCell, isReadOnly, rowMap, setActiveCell });

  return (
    <div className="space-y-4">
      {viewMode === "completed" && <CompletedModeBanner />}

      {error ? (
        <ErrorPanel error={error} />
      ) : (
        <OcrTableContent
          data={data}
          columns={columns}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          contextValue={contextValue}
          activeCell={activeCell}
          setActiveCell={setActiveCell}
          editableFieldOrder={editableFieldOrder}
          rowIds={rowIds}
          rowMap={rowMap}
          isReadOnly={isReadOnly}
          editingRow={editingRow}
          onCloseEditModal={onCloseEditModal}
        />
      )}

      {viewMode === "current" && <StatusLegend />}
    </div>
  );
}
