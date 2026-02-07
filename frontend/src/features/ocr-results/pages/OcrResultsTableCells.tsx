/* eslint-disable max-lines, max-lines-per-function, complexity, max-params -- 関連する画面ロジックを1箇所で管理するため */
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { type KeyboardEvent, createContext, useContext, useRef, useState, useEffect } from "react";

import type { OcrResultItem } from "../api";
import { computeShippingSlipText, type RowInputState } from "../utils/ocr-utils";

import { cn } from "@/shared/libs/utils";
import {
  EditableTextCell as GenericTextCell,
  EditableDateCell as GenericDateCell,
} from "@/shared/components/data/EditableCells";
import { resolveEnterTarget, resolveTabTarget } from "@/shared/utils/keyboard-navigation";

// ============================================
// Types & Defaults
// ============================================

const orEmpty = (v: string | null | undefined) => v || "";

/**
 * 日付文字列をHTML date input用のYYYY-MM-DD形式に変換
 */
export const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const converted = dateStr.replace(/\//g, "-");
  const match = converted.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    if (year === undefined || month === undefined || day === undefined) return converted;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return converted;
};

const getLot1 = (r: OcrResultItem) => r.manual_lot_no_1 || (r.lot_no_1 ?? r.lot_no ?? "");
const getShippingDate = (r: OcrResultItem) =>
  formatDateForInput(r.manual_shipping_date || r.calculated_shipping_date);

export const buildRowDefaults = (row: OcrResultItem): RowInputState => ({
  version: row.manual_version ?? 0,
  lotNo1: getLot1(row),
  quantity1: row.manual_quantity_1 || orEmpty(row.quantity_1),
  lotNo2: row.manual_lot_no_2 || orEmpty(row.lot_no_2),
  quantity2: row.manual_quantity_2 || orEmpty(row.quantity_2),
  inboundNo1: row.manual_inbound_no || orEmpty(row.inbound_no),
  inboundNo2: orEmpty(row.manual_inbound_no_2),
  shippingDate: getShippingDate(row),
  shippingSlipText: orEmpty(row.manual_shipping_slip_text),
  shippingSlipTextEdited: row.manual_shipping_slip_text_edited || false,
  jikuCode: row.manual_jiku_code || orEmpty(row.jiku_code),
  materialCode: row.manual_material_code || orEmpty(row.material_code),
  deliveryQuantity: row.manual_delivery_quantity || orEmpty(row.delivery_quantity),
  deliveryDate: formatDateForInput(row.delivery_date),
  processStatus: row.process_status || "pending",
  errorFlags: row.error_flags || {},
});

// ============================================
// Helpers
// ============================================

const isValidDateInput = (v: string): boolean => {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
};

const insertSoftBreaks = (text: string) => {
  return text.split("/").map((part, i, arr) => (
    <span key={i}>
      {part}
      {i < arr.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </span>
  ));
};

// ============================================
// Contexts
// ============================================

export type EditableFieldKey = keyof RowInputState;

interface OcrInputsContextType {
  getInputs: (row: OcrResultItem) => RowInputState;
  updateInputs: (row: OcrResultItem, patch: Partial<RowInputState>) => void;
}

export const OcrInputsContext = createContext<OcrInputsContextType | null>(null);

export function useOcrInputs() {
  const context = useContext(OcrInputsContext);
  if (!context) throw new Error("useOcrInputs must be used within OcrInputsContext.Provider");
  return context;
}

type ActiveCell = { rowId: number; field: EditableFieldKey } | null;

interface OcrCellEditingContextType {
  activeCell: ActiveCell;
  setActiveCell: (cell: ActiveCell) => void;
  editableFieldOrder: EditableFieldKey[];
  rowIds: number[];
  getRowById: (rowId: number) => OcrResultItem | undefined;
  isReadOnly?: boolean;
}

export const OcrCellEditingContext = createContext<OcrCellEditingContextType | null>(null);

export function useOcrCellEditing() {
  const context = useContext(OcrCellEditingContext);
  if (!context)
    throw new Error("useOcrCellEditing must be used within OcrCellEditingContext.Provider");
  return context;
}

// ============================================
// Internal Navigation Logic
// ============================================

const isSkipableRow = (row: OcrResultItem | undefined) => row?.status === "processing";

// ============================================
// Individual Cell Components
// ============================================

/**
 * OCR状態バッジ
 */
function OcrStatusBadge({ row }: { row: OcrResultItem }) {
  let status: "ok" | "error" | "warning" = "ok";
  let label = "OCR正常";

  if (row.status === "ERROR" || row.status === "error") {
    status = "error";
    label = "読取エラー";
  } else if (row.jiku_format_error || row.date_format_error) {
    status = "warning";
    label = "形式エラー";
  } else if (row.status === "processing") {
    status = "warning";
    label = "処理中";
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded px-1 py-0.5 w-full",
        status === "ok"
          ? "bg-green-50 text-green-700"
          : status === "error"
            ? "bg-red-50 text-red-700"
            : "bg-orange-50 text-orange-700",
      )}
    >
      {status === "ok" && <CheckCircle className="h-3 w-3" />}
      {status === "error" && <XCircle className="h-3 w-3" />}
      {status === "warning" && <AlertCircle className="h-3 w-3" />}
      <span className="font-medium whitespace-nowrap text-[10px]">{label}</span>
    </div>
  );
}

/**
 * マスタ判定バッジ
 */
function MasterStatusBadge({ row }: { row: OcrResultItem }) {
  let status: "ok" | "error" | "warning" = "ok";
  let label = "マスタ一致";

  if (row.master_not_found) {
    status = "error";
    label = "マスタ未登録";
  } else if (row.sap_match_type === "not_found") {
    status = "warning";
    label = "SAP未一致";
  } else if (row.sap_match_type === "prefix") {
    status = "warning";
    label = "前方一致";
  } else if (row.sap_match_type === "master_reverse") {
    status = "ok";
    label = "マスタ経由";
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded px-1 py-0.5 w-full",
        status === "ok"
          ? "bg-blue-50 text-blue-700"
          : status === "error"
            ? "bg-red-50 text-red-700"
            : "bg-yellow-50 text-yellow-700",
      )}
    >
      {status === "ok" && <CheckCircle className="h-3 w-3" />}
      {status === "error" && <XCircle className="h-3 w-3" />}
      {status === "warning" && <AlertTriangle className="h-3 w-3" />}
      <span className="font-medium whitespace-nowrap text-[10px]">{label}</span>
    </div>
  );
}

export function StatusReviewCell({ row }: { row: OcrResultItem }) {
  return (
    <div className="flex flex-col gap-1 items-start justify-center h-full">
      <OcrStatusBadge row={row} />
      <MasterStatusBadge row={row} />
    </div>
  );
}

const resolveIsSecondary = (field: EditableFieldKey) => {
  return field === "lotNo2" || field === "inboundNo2" || field === "quantity2";
};

export function EditableTextCell({
  row,
  field,
  placeholder,
  inputClassName,
  hasWarning = false,
}: {
  row: OcrResultItem;
  field: EditableFieldKey;
  placeholder?: string;
  inputClassName?: string;
  hasWarning?: boolean;
}) {
  const { getInputs, updateInputs } = useOcrInputs();
  const { activeCell, setActiveCell, editableFieldOrder, rowIds, isReadOnly, getRowById } =
    useOcrCellEditing();
  const value = getInputs(row)[field] as string;
  const isActive = activeCell?.rowId === row.id && activeCell?.field === field;
  const initialValueRef = useRef(value);
  const [hasError, setHasError] = useState(false);
  const isSecondary = resolveIsSecondary(field);

  const isDisabled = row.status === "processing" || isReadOnly;

  const validateValue = (nextValue: string) => {
    if (field === "shippingDate" || field === "deliveryDate") {
      return isValidDateInput(nextValue);
    }
    return true;
  };

  const handleNavigate = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      updateInputs(row, { [field]: initialValueRef.current });
      setHasError(false);
      setActiveCell(null);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (!validateValue(value)) {
        setHasError(true);
        return;
      }
      const direction = event.shiftKey ? -1 : 1;
      const target = resolveTabTarget(
        row.id,
        field,
        direction,
        editableFieldOrder,
        rowIds,
        getRowById,
        isSkipableRow,
      );
      if (target) {
        setHasError(false);
        setActiveCell(target);
      } else {
        setActiveCell(null);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!validateValue(value)) {
        setHasError(true);
        return;
      }
      const direction = event.shiftKey ? -1 : 1;
      const target = resolveEnterTarget(row.id, field, direction, rowIds, getRowById, isSkipableRow);
      if (target) {
        setHasError(false);
        setActiveCell(target);
      } else {
        setActiveCell(null);
      }
    }
  };

  return (
    <GenericTextCell
      value={value}
      isActive={isActive}
      isDisabled={isDisabled ?? undefined}
      hasWarning={hasWarning}
      hasError={hasError}
      placeholder={placeholder}
      inputClassName={inputClassName}
      isSecondary={isSecondary}
      onUpdate={(nextValue) => {
        updateInputs(row, { [field]: nextValue });
        if (hasError && isValidDateInput(nextValue)) setHasError(false);
      }}
      onBlur={() => {
        if (!isActive) return;
        const isValid = validateValue(value);
        setHasError(!isValid);
        if (isValid) setActiveCell(null);
      }}
      onKeyDown={handleNavigate}
      onActivate={() => setActiveCell({ rowId: row.id, field })}
    />
  );
}

export function EditableDateCell({ row, field }: { row: OcrResultItem; field: EditableFieldKey }) {
  const { getInputs, updateInputs } = useOcrInputs();
  const { activeCell, setActiveCell, editableFieldOrder, rowIds, isReadOnly, getRowById } =
    useOcrCellEditing();
  const value = getInputs(row)[field] as string;

  const hasDateError = field === "deliveryDate" && row.date_format_error;
  const isShippingDate = field === "shippingDate";
  const isCalculated = isShippingDate && !value && row.calculated_shipping_date;
  const inputValue =
    value || (isCalculated ? formatDateForInput(row.calculated_shipping_date) : "");
  const isActive = activeCell?.rowId === row.id && activeCell?.field === field;
  const initialValueRef = useRef(value);
  const [hasError, setHasError] = useState(false);

  const isDisabled = row.status === "processing" || isReadOnly;

  const handleNavigate = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      updateInputs(row, { [field]: initialValueRef.current });
      setHasError(false);
      setActiveCell(null);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (!isValidDateInput(value)) {
        setHasError(true);
        return;
      }
      const direction = event.shiftKey ? -1 : 1;
      const target = resolveTabTarget(
        row.id,
        field,
        direction,
        editableFieldOrder,
        rowIds,
        getRowById,
        isSkipableRow,
      );
      if (target) {
        setHasError(false);
        setActiveCell(target);
      } else {
        setActiveCell(null);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!isValidDateInput(value)) {
        setHasError(true);
        return;
      }
      const direction = event.shiftKey ? -1 : 1;
      const target = resolveEnterTarget(row.id, field, direction, rowIds, getRowById, isSkipableRow);
      if (target) {
        setHasError(false);
        setActiveCell(target);
      } else {
        setActiveCell(null);
      }
    }
  };

  return (
    <GenericDateCell
      value={inputValue || ""}
      isActive={isActive}
      isDisabled={isDisabled ?? undefined}
      hasWarning={hasDateError}
      hasError={hasError}
      onUpdate={(nextValue) => {
        updateInputs(row, { [field]: nextValue });
        if (hasError && isValidDateInput(nextValue)) setHasError(false);
      }}
      onBlur={() => {
        if (!isActive) return;
        const isValid = isValidDateInput(value);
        setHasError(!isValid);
        if (isValid) setActiveCell(null);
      }}
      onKeyDown={handleNavigate}
      onActivate={() => setActiveCell({ rowId: row.id, field })}
      title={isCalculated ? `自動計算（LT = ${row.transport_lt_days} 日）` : ""}
      className={cn(
        isCalculated && !hasDateError && !hasError && "text-blue-700",
        isCalculated && !isActive && !hasDateError && "border-blue-300",
      )}
      inputClassName={cn(
        isCalculated && !hasDateError && !hasError && "border-blue-300 focus:border-blue-400 focus:ring-blue-200",
      )}
    />
  );
}

export function EditableShippingSlipCell({ row }: { row: OcrResultItem }) {
  const { getInputs, updateInputs } = useOcrInputs();
  const { activeCell, setActiveCell, editableFieldOrder, rowIds, isReadOnly, getRowById } =
    useOcrCellEditing();
  const input = getInputs(row);
  const computedText = computeShippingSlipText(row.shipping_slip_text, input);
  const displayText = input.shippingSlipTextEdited ? input.shippingSlipText : computedText;
  const fallbackText = displayText || "";
  const [draft, setDraft] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const isActive = activeCell?.rowId === row.id && activeCell?.field === "shippingSlipText";
  const initialStateRef = useRef({
    text: input.shippingSlipText,
    edited: input.shippingSlipTextEdited,
  });
  const wasActiveRef = useRef(false);

  const isDisabled = row.status === "processing" || isReadOnly;

  const commit = () => {
    if (draft === computedText) {
      updateInputs(row, { shippingSlipText: "", shippingSlipTextEdited: false });
    } else {
      updateInputs(row, { shippingSlipText: draft, shippingSlipTextEdited: true });
    }
    setActiveCell(null);
  };

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (!becameActive) return;
    initialStateRef.current = {
      text: input.shippingSlipText,
      edited: input.shippingSlipTextEdited,
    };
    setDraft(displayText || "");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      inputRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }, [displayText, input.shippingSlipText, input.shippingSlipTextEdited, isActive]);

  const handleNavigate = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      updateInputs(row, {
        shippingSlipText: initialStateRef.current.text,
        shippingSlipTextEdited: initialStateRef.current.edited,
      });
      setActiveCell(null);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      commit();
      const direction = event.shiftKey ? -1 : 1;
      const target = resolveTabTarget<number, EditableFieldKey, OcrResultItem>(
        row.id,
        "shippingSlipText",
        direction,
        editableFieldOrder,
        rowIds,
        getRowById,
      );
      if (target) {
        setActiveCell(target);
      }
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      commit();
      const direction = event.shiftKey ? -1 : 1;
      const target = resolveEnterTarget<number, EditableFieldKey, OcrResultItem>(row.id, "shippingSlipText", direction, rowIds, getRowById);
      if (target) {
        setActiveCell(target);
      }
    }
  };

  if (isActive) {
    return (
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (!isActive) return;
          commit();
        }}
        onKeyDown={handleNavigate}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        className="w-full min-h-[2rem] rounded-md border border-slate-200 bg-white/90 px-2 py-0.5 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
        disabled={isDisabled}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (isDisabled) return;
        setActiveCell({ rowId: row.id, field: "shippingSlipText" });
      }}
      onKeyDown={(event) => {
        if (isDisabled) return;
        if (event.key === "Enter" || event.key === "F2") {
          event.preventDefault();
          setActiveCell({ rowId: row.id, field: "shippingSlipText" });
        }
      }}
      className={cn(
        "group flex w-full rounded-md px-2 py-0.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 border cursor-text items-center",
        // 空欄時の枠表示
        !fallbackText && "border-dashed border-slate-300 bg-slate-50/30",
        // 値あり時
        fallbackText && "bg-transparent border-transparent",
        // Hover
        "hover:bg-white hover:border-slate-300 hover:border-solid",
        "text-slate-700",
        isDisabled && "cursor-not-allowed opacity-60",
      )}
      disabled={isDisabled}
    >
      <div className="flex h-full flex-col justify-center leading-relaxed">
        <span className="whitespace-pre-wrap" style={{ overflowWrap: "break-word" }}>
          {fallbackText ? insertSoftBreaks(fallbackText) : "\u00A0"}
        </span>
      </div>
    </button>
  );
}

export function LotInfoCell({ row }: { row: OcrResultItem }) {
  return (
    <div className="flex flex-col gap-3 py-2">
      {/* ロット1 */}
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-3">
        <EditableTextCell row={row} field="lotNo1" placeholder="ロットNo(1)" />
        <EditableTextCell row={row} field="inboundNo1" placeholder="入庫No(1)" />
        <EditableTextCell
          row={row}
          field="quantity1"
          placeholder="数量(1)"
          inputClassName="text-right"
        />
      </div>

      {/* ロット2 */}
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-3">
        <EditableTextCell row={row} field="lotNo2" placeholder="ロットNo(2)" />
        <EditableTextCell row={row} field="inboundNo2" placeholder="入庫No(2)" />
        <EditableTextCell
          row={row}
          field="quantity2"
          placeholder="数量(2)"
          inputClassName="text-right"
        />
      </div>
    </div>
  );
}

// ============================================
// Shared Components for Table
// ============================================

/**
 * ステータス凡例コンポーネント
 */
export function StatusLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[10px] text-gray-400 w-16 shrink-0">OCR状態:</span>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 px-1 bg-green-50 text-green-700 rounded">
            <CheckCircle className="h-3 w-3" />
            正常
          </span>
          <span className="flex items-center gap-1 px-1 bg-orange-50 text-orange-700 rounded">
            <AlertCircle className="h-3 w-3" />
            形式エラー
          </span>
          <span className="flex items-center gap-1 px-1 bg-red-50 text-red-700 rounded">
            <XCircle className="h-3 w-3" />
            読取エラー
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-[10px] text-gray-400 w-16 shrink-0">マスタ判定:</span>
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1 px-1 bg-blue-50 text-blue-700 rounded">
            <CheckCircle className="h-3 w-3" />
            一致
          </span>
          <span className="flex items-center gap-1 px-1 bg-yellow-50 text-yellow-700 rounded">
            <AlertTriangle className="h-3 w-3" />
            前方一致
          </span>
          <span className="flex items-center gap-1 px-1 bg-red-50 text-red-700 rounded">
            <XCircle className="h-3 w-3" />
            マスタ未登録
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 行のスタイリング取得
 */
export function getRowClassName(row: OcrResultItem): string {
  if (row.status === "ERROR" || row.status === "error") return "bg-red-50/30";
  if (row.master_not_found) return "bg-amber-50/30";
  if (row.jiku_format_error || row.date_format_error) return "bg-amber-50/30";
  return "";
}
