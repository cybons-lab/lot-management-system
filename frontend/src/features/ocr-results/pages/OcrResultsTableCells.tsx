/* eslint-disable max-lines */
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import type { OcrResultItem } from "../api";

import { cn } from "@/shared/libs/utils";

// ============================================
// Types & Defaults
// ============================================

export type RowInputState = {
  lotNo1: string;
  quantity1: string;
  lotNo2: string;
  quantity2: string;
  inboundNo1: string;
  inboundNo2: string;
  shippingDate: string;
  shippingSlipText: string;
  shippingSlipTextEdited: boolean;
  jikuCode: string;
  materialCode: string;
  deliveryQuantity: string;
  deliveryDate: string;
  processStatus: string;
  errorFlags: Record<string, boolean>;
};

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
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return converted;
};

const getLot1 = (r: OcrResultItem) => r.manual_lot_no_1 || (r.lot_no_1 ?? r.lot_no ?? "");
const getShippingDate = (r: OcrResultItem) =>
  formatDateForInput(r.manual_shipping_date || r.calculated_shipping_date);

export const buildRowDefaults = (row: OcrResultItem): RowInputState => ({
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

const formatDateToMMDD = (dateStr: string): string | null => {
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) return null;
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${month}/${day}`;
};

const buildLotString = (input: RowInputState): string => {
  const lotEntries = [
    input.lotNo1 ? `${input.lotNo1}（${input.quantity1 || ""}）` : "",
    input.lotNo2 ? `${input.lotNo2}（${input.quantity2 || ""}）` : "",
  ].filter(Boolean);
  return lotEntries.join("/");
};

const applyLotReplacement = (template: string, input: RowInputState): string => {
  const lotString = buildLotString(input);
  const normalized = template.replace(/(^|\/)ロット($|\/)/g, (_, p1, p2) => {
    return `${p1}ロット番号(数量)${p2}`;
  });
  return normalized.replace(/ロット番号\s*[(（]数量[）)]/g, lotString);
};

const applyDateReplacements = (
  template: string,
  input: RowInputState,
  row: OcrResultItem,
): string => {
  let result = template;

  const shippingDate = input.shippingDate || row.calculated_shipping_date;
  if (shippingDate) {
    const formatted = formatDateToMMDD(shippingDate);
    if (formatted) {
      result = result.replace(/出荷▲\/▲/g, `出荷${formatted}`);
    }
  }

  if (input.deliveryDate) {
    const formatted = formatDateToMMDD(input.deliveryDate);
    if (formatted) {
      result = result.replace(/着日指定●\/●/g, `着日指定${formatted}`);
    }
  }

  return result;
};

const validateLotInfo = (
  input: RowInputState,
): { hasValidLot: boolean; hasIncomplete: boolean } => {
  const lot1HasNo = Boolean(input.lotNo1);
  const lot1HasQty = Boolean(input.quantity1);
  const lot2HasNo = Boolean(input.lotNo2);
  const lot2HasQty = Boolean(input.quantity2);

  const hasValidLot1 = lot1HasNo && lot1HasQty;
  const hasValidLot2 = lot2HasNo && lot2HasQty;
  const hasValidLot = hasValidLot1 || hasValidLot2;

  // 数量が空でもエラーにしない（ロバストネス要件）
  const hasIncomplete = false;

  return { hasValidLot, hasIncomplete };
};

const buildShippingSlipText = (
  template: string | null,
  input: RowInputState,
  row: OcrResultItem,
): string => {
  if (!template) return "";

  const { hasValidLot } = validateLotInfo(input);
  const hasInboundNo = Boolean(input.inboundNo1);

  if (!hasValidLot && !hasInboundNo) {
    return template;
  }

  let result = template;
  if (hasValidLot) {
    result = applyLotReplacement(result, input);
  }

  if (hasInboundNo) {
    result = result.replace(/入庫番号/g, input.inboundNo1);
  }

  result = applyDateReplacements(result, input, row);

  return result;
};

// ============================================
// Context
// ============================================

export interface OcrInputsContextType {
  getInputs: (row: OcrResultItem) => RowInputState;
  updateInputs: (row: OcrResultItem, patch: Partial<RowInputState>) => void;
}

export const OcrInputsContext = createContext<OcrInputsContextType | null>(null);

export const useOcrInputs = () => {
  const context = useContext(OcrInputsContext);
  if (!context) throw new Error("useOcrInputs must be used within OcrInputsProvider");
  return context;
};

// ============================================
// Components
// ============================================

function OcrStatusBadge({ row }: { row: OcrResultItem }) {
  let status: "ok" | "error" | "warning" = "ok";
  let label = "OCR正常";
  if (row.status === "ERROR") {
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
      <span className="font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

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
      <span className="font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

export function StatusReviewCell({ row }: { row: OcrResultItem }) {
  return (
    <div className="flex flex-col gap-1 text-[10px] items-start">
      <OcrStatusBadge row={row} />
      <MasterStatusBadge row={row} />
    </div>
  );
}

// Deprecated individual icons replaced by StatusReviewCell, but keeping exports if needed by other files (though we will update useOcrColumns)
export function StatusIcon({ row }: { row: OcrResultItem }) {
  return <StatusReviewCell row={row} />;
}

export function SapMatchIcon({ row }: { row: OcrResultItem }) {
  // Satisfy unused row lint while returning nothing visible
  return <span className="hidden">{row.id}</span>;
}

export function getRowClassName(row: OcrResultItem): string {
  if (row.status === "ERROR") return "bg-red-50/50";
  if (row.master_not_found) return "bg-red-50/50"; // Master missing is critical
  if (row.jiku_format_error || row.date_format_error) return "bg-orange-50/50";
  if (row.status === "processing") return "bg-blue-50/30 animate-pulse";
  return "";
}

export function StatusLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[10px] text-gray-400 w-12">OCR状態:</span>
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
        <span className="font-bold text-[10px] text-gray-400 w-12">マスタ判定:</span>
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1 px-1 bg-blue-50 text-blue-700 rounded">
            <CheckCircle className="h-3 w-3" />
            一致
          </span>
          <span className="flex items-center gap-1 px-1 bg-yellow-50 text-yellow-700 rounded">
            <AlertTriangle className="h-3 w-3" />
            前方一致/SAP未一致
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

export function EditableTextCell({
  row,
  field,
  placeholder,
  inputClassName,
  hasWarning = false,
}: {
  row: OcrResultItem;
  field: Extract<keyof RowInputState, string>;
  placeholder?: string;
  inputClassName?: string;
  hasWarning?: boolean;
}) {
  const { getInputs, updateInputs } = useOcrInputs();
  const value = getInputs(row)[field] as string;

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => updateInputs(row, { [field]: e.target.value })}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1",
        hasWarning
          ? "border-red-400 bg-red-50 focus:border-red-600 focus:ring-red-500"
          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
        inputClassName,
      )}
      disabled={row.status === "processing"}
    />
  );
}

export function EditableDateCell({
  row,
  field,
}: {
  row: OcrResultItem;
  field: Extract<keyof RowInputState, string>;
}) {
  const { getInputs, updateInputs } = useOcrInputs();
  const value = getInputs(row)[field] as string;

  const hasDateError = field === "deliveryDate" && row.date_format_error;
  const isShippingDate = field === "shippingDate";
  const isCalculated = isShippingDate && !value && row.calculated_shipping_date;
  const displayValue = isCalculated ? row.calculated_shipping_date : value;

  return (
    <input
      type="date"
      value={displayValue || ""}
      onChange={(e) => updateInputs(row, { [field]: e.target.value })}
      title={isCalculated ? `自動計算（LT=${row.transport_lt_days}日）` : ""}
      className={cn(
        "w-full rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1",
        hasDateError
          ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500"
          : isCalculated
            ? "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
      )}
      disabled={row.status === "processing"}
    />
  );
}

export function EditableShippingSlipCell({ row }: { row: OcrResultItem }) {
  const { getInputs, updateInputs } = useOcrInputs();
  const input = getInputs(row);
  const computedText = buildShippingSlipText(row.shipping_slip_text, input, row);
  const displayText = input.shippingSlipTextEdited ? input.shippingSlipText : computedText;
  const fallbackText = displayText || "-";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEditing = () => {
    setDraft(displayText || "");
    setIsEditing(true);
  };

  const commit = () => {
    if (draft === computedText) {
      updateInputs(row, { shippingSlipText: "", shippingSlipTextEdited: false });
    } else {
      updateInputs(row, { shippingSlipText: draft, shippingSlipTextEdited: true });
    }
    setIsEditing(false);
  };

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsEditing(false);
            setDraft(displayText || "");
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
          }
        }}
        className="w-full min-h-[2.5rem] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <button
      type="button"
      onDoubleClick={startEditing}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          startEditing();
        }
      }}
      className={cn(
        "min-h-[2.5rem] w-full cursor-text rounded-md border border-gray-300 bg-slate-50 px-2 py-1 text-left text-xs whitespace-pre-wrap break-words",
        row.status === "processing" && "cursor-not-allowed opacity-70",
      )}
      disabled={row.status === "processing"}
    >
      {fallbackText}
    </button>
  );
}

export function LotInfoCell({ row }: { row: OcrResultItem }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      {/* ロット1 */}
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
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
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
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

export function LotInfoReadOnlyCell({ row }: { row: OcrResultItem }) {
  return (
    <div className="flex flex-col gap-1 py-1 text-xs">
      {/* ロット1 */}
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
        <span>{row.manual_lot_no_1 || row.lot_no || "-"}</span>
        <span>{row.manual_inbound_no || row.inbound_no || "-"}</span>
        <span className="text-right">{row.manual_quantity_1 || "-"}</span>
      </div>
      {/* ロット2 */}
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
        <span>{row.manual_lot_no_2 || "-"}</span>
        <span>{row.manual_inbound_no_2 || "-"}</span>
        <span className="text-right">{row.manual_quantity_2 || "-"}</span>
      </div>
    </div>
  );
}
