/**
 * OCR結果一覧ページ（v_ocr_resultsビューベース）
 *
 * エラー表示機能:
 * - マスタ未登録: 黄色背景 + ⚠アイコン
 * - パースエラー（次区/日付フォーマット）: 赤背景
 * - 総合エラー: 赤字ステータス
 */

/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable jsx-a11y/no-autofocus */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  Download,
  Minus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ocrResultsApi, type OcrResultItem, type OcrResultEditPayload } from "../api";

import { Button, Card, CardContent } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { cn } from "@/shared/libs/utils";

/**
 * ステータスアイコンを返す
 */
function StatusIcon({ row }: { row: OcrResultItem }) {
  if (row.status === "ERROR") {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  if (row.master_not_found) {
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
  if (row.jiku_format_error || row.date_format_error) {
    return <AlertCircle className="h-4 w-4 text-orange-500" />;
  }
  return <CheckCircle className="h-4 w-4 text-green-500" />;
}

/**
 * SAPマッチングアイコンを返す
 */
function SapMatchIcon({ row }: { row: OcrResultItem }) {
  const matchType = row.sap_match_type;

  if (matchType === "exact") {
    return (
      <div className="flex items-center gap-1" title="直接一致">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-xs text-green-700">一致</span>
      </div>
    );
  }

  if (matchType === "master_reverse") {
    return (
      <div className="flex items-center gap-1" title="マスタ経由一致">
        <ArrowRightLeft className="h-4 w-4 text-blue-500" />
        <span className="text-xs text-blue-700">マスタ経由</span>
      </div>
    );
  }

  if (matchType === "prefix") {
    return (
      <div className="flex items-center gap-1" title="前方一致（要確認）">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <span className="text-xs text-yellow-700">前方一致</span>
      </div>
    );
  }

  if (matchType === "not_found") {
    return (
      <div className="flex items-center gap-1" title="SAP未一致">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-xs text-red-700">未一致</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" title="未照合">
      <Minus className="h-4 w-4 text-gray-400" />
      <span className="text-xs text-gray-500">-</span>
    </div>
  );
}

/**
 * 行のスタイルクラスを返す
 */
function getRowClassName(row: OcrResultItem): string {
  if (row.status === "ERROR") {
    return "bg-red-50";
  }
  if (row.master_not_found) {
    return "bg-yellow-50";
  }
  if (row.jiku_format_error || row.date_format_error) {
    return "bg-orange-50";
  }
  return "";
}

/**
 * ステータス凡例コンポーネント
 */
function StatusLegend() {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          正常
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          マスタ未登録
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
          フォーマットエラー
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          エラー
        </div>
      </div>
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="font-medium">SAPマッチ:</span>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          一致
        </div>
        <div className="flex items-center gap-1">
          <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
          マスタ経由
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          前方一致
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          未一致
        </div>
      </div>
    </div>
  );
}

type RowInputState = {
  lotNo1: string;
  quantity1: string;
  lotNo2: string;
  quantity2: string;
  inboundNo: string;
  shippingDate: string;
  shippingSlipText: string;
  shippingSlipTextEdited: boolean;
  jikuCode: string;
  materialCode: string;
  deliveryQuantity: string;
  deliveryDate: string;
};

const orEmpty = (v: string | null | undefined) => v || "";

const buildRowDefaults = (row: OcrResultItem): RowInputState => ({
  lotNo1: row.manual_lot_no_1 || orEmpty(row.lot_no),
  quantity1: orEmpty(row.manual_quantity_1),
  lotNo2: orEmpty(row.manual_lot_no_2),
  quantity2: orEmpty(row.manual_quantity_2),
  inboundNo: row.manual_inbound_no || orEmpty(row.inbound_no),
  shippingDate: orEmpty(row.manual_shipping_date),
  shippingSlipText: orEmpty(row.manual_shipping_slip_text),
  shippingSlipTextEdited: row.manual_shipping_slip_text_edited || false,
  jikuCode: row.manual_jiku_code || orEmpty(row.jiku_code),
  materialCode: row.manual_material_code || orEmpty(row.material_code),
  deliveryQuantity: row.manual_delivery_quantity || orEmpty(row.delivery_quantity),
  deliveryDate: orEmpty(row.delivery_date),
});

// ============================================
// Context for Inputs normalization
// ============================================

interface OcrInputsContextType {
  getInputs: (row: OcrResultItem) => RowInputState;
  updateInputs: (row: OcrResultItem, patch: Partial<RowInputState>) => void;
}

const OcrInputsContext = createContext<OcrInputsContextType | null>(null);

const useOcrInputs = () => {
  const context = useContext(OcrInputsContext);
  if (!context) throw new Error("useOcrInputs must be used within OcrInputsProvider");
  return context;
};

/**
 * セルコンポーネント: テキスト入力
 */
function EditableTextCell({
  row,
  field,
  placeholder,
  inputClassName,
  hasWarning = false,
}: {
  row: OcrResultItem;
  field: Extract<keyof RowInputState, string>; // Ensure we only use keys that have string values
  placeholder?: string;
  inputClassName?: string;
  hasWarning?: boolean;
}) {
  const { getInputs, updateInputs } = useOcrInputs();
  const value = getInputs(row)[field] as string; // Explicitly cast to string

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
    />
  );
}

/**
 * セルコンポーネント: 日付入力
 */
function EditableDateCell({
  row,
  field,
}: {
  row: OcrResultItem;
  field: Extract<keyof RowInputState, string>;
}) {
  const { getInputs, updateInputs } = useOcrInputs();
  const value = getInputs(row)[field] as string;

  // 納期フィールドで日付フォーマットエラーがある場合は赤枠
  const hasDateError = field === "deliveryDate" && row.date_format_error;

  // 出荷日フィールドの場合、手入力値がなければ自動計算値を表示
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
    />
  );
}

/**
 * セルコンポーネント: 読取専用プレビュー
 */
function EditableShippingSlipCell({ row }: { row: OcrResultItem }) {
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

  if (isEditing) {
    return (
      <textarea
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
        autoFocus
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
      className="min-h-[2.5rem] w-full cursor-text rounded-md border border-gray-300 bg-slate-50 px-2 py-1 text-left text-xs whitespace-pre-wrap break-words"
    >
      {fallbackText}
    </button>
  );
}

function LotEntryCell({
  row,
  lotField,
  quantityField,
}: {
  row: OcrResultItem;
  lotField: Extract<keyof RowInputState, string>;
  quantityField: Extract<keyof RowInputState, string>;
}) {
  const { getInputs } = useOcrInputs();
  const input = getInputs(row);

  // ロットNoと数量の入力状態をチェック
  const lotValue = input[lotField] as string;
  const qtyValue = input[quantityField] as string;
  const hasLot = Boolean(lotValue);
  const hasQty = Boolean(qtyValue);

  // 片方だけ入力されている場合は警告
  const hasIncomplete = hasLot !== hasQty;

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <EditableTextCell
        row={row}
        field={lotField}
        placeholder="ロットNo"
        hasWarning={hasIncomplete}
      />
      <div className="flex items-center justify-end gap-1">
        <span className="text-[10px] text-slate-400 shrink-0">数量:</span>
        <EditableTextCell
          row={row}
          field={quantityField}
          placeholder="数量"
          inputClassName="w-[70px] text-right"
          hasWarning={hasIncomplete}
        />
      </div>
    </div>
  );
}

const formatItemNo = (itemNo: string | null) => {
  if (!itemNo) return "-";
  return itemNo.length > 6 ? itemNo.slice(-6) : itemNo;
};

const getContentValue = (row: OcrResultItem, key: string): string => {
  const value = row.content?.[key];
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
};

/**
 * 日付をMM/DD形式にフォーマット
 */
const formatDateToMMDD = (dateStr: string): string | null => {
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) return null;
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${month}/${day}`;
};

/**
 * ロット情報文字列を作成
 */
const buildLotString = (input: RowInputState): string => {
  const lotEntries = [
    input.lotNo1 ? `${input.lotNo1}（${input.quantity1 || ""}）` : "",
    input.lotNo2 ? `${input.lotNo2}（${input.quantity2 || ""}）` : "",
  ].filter(Boolean);
  return lotEntries.join("/");
};

/**
 * テンプレートにロット情報を適用
 */
const applyLotReplacement = (template: string, input: RowInputState): string => {
  const lotString = buildLotString(input);
  const normalized = template.replace(/(^|\/)ロット($|\/)/g, (_, p1, p2) => {
    return `${p1}ロット番号(数量)${p2}`;
  });
  return normalized.replace(/ロット番号\s*[(（]数量[）)]/g, lotString);
};

/**
 * テンプレートに日付情報を適用
 */
const applyDateReplacements = (
  template: string,
  input: RowInputState,
  row: OcrResultItem,
): string => {
  let result = template;

  // 出荷日の置換
  const shippingDate = input.shippingDate || row.calculated_shipping_date;
  if (shippingDate) {
    const formatted = formatDateToMMDD(shippingDate);
    if (formatted) {
      result = result.replace(/出荷▲\/▲/g, `出荷${formatted}`);
    }
  }

  // 納期の置換
  if (input.deliveryDate) {
    const formatted = formatDateToMMDD(input.deliveryDate);
    if (formatted) {
      result = result.replace(/着日指定●\/●/g, `着日指定${formatted}`);
    }
  }

  return result;
};

/**
 * ロット情報のバリデーション状態をチェック
 */
const validateLotInfo = (
  input: RowInputState,
): { hasValidLot: boolean; hasIncomplete: boolean } => {
  const lot1HasNo = Boolean(input.lotNo1);
  const lot1HasQty = Boolean(input.quantity1);
  const lot2HasNo = Boolean(input.lotNo2);
  const lot2HasQty = Boolean(input.quantity2);

  // 有効なロット情報: ロットNoと数量がペアになっている
  const hasValidLot1 = lot1HasNo && lot1HasQty;
  const hasValidLot2 = lot2HasNo && lot2HasQty;
  const hasValidLot = hasValidLot1 || hasValidLot2;

  // 不完全な入力: どちらか片方だけ入力されている
  const lot1Incomplete = lot1HasNo !== lot1HasQty; // XOR: 片方だけtrue
  const lot2Incomplete = lot2HasNo !== lot2HasQty;
  const hasIncomplete = lot1Incomplete || lot2Incomplete;

  return { hasValidLot, hasIncomplete };
};

const buildShippingSlipText = (
  template: string | null,
  input: RowInputState,
  row: OcrResultItem,
): string => {
  if (!template) return "";

  const { hasValidLot } = validateLotInfo(input);
  const hasInboundNo = Boolean(input.inboundNo);

  // ロット・数量・入庫Noが全て空の場合、置換せずそのまま返す
  if (!hasValidLot && !hasInboundNo) {
    return template;
  }

  // ロット情報の置換（有効なロット情報がある場合のみ）
  let result = template;
  if (hasValidLot) {
    result = applyLotReplacement(result, input);
  }

  // 入庫番号の置換
  if (hasInboundNo) {
    result = result.replace(/入庫番号/g, input.inboundNo);
  }

  // 日付情報の置換
  result = applyDateReplacements(result, input, row);

  return result;
};

// ============================================
// Main Page Component
// ============================================

export function OcrResultsListPage() {
  const { token } = useAuth();
  const [taskDate, setTaskDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rowInputs, setRowInputs] = useState<Record<number, RowInputState>>({});
  const saveTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const refreshMasterRef = useRef<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const buildPayload = useCallback(
    (input: RowInputState): OcrResultEditPayload => ({
      lot_no_1: input.lotNo1 || null,
      quantity_1: input.quantity1 || null,
      lot_no_2: input.lotNo2 || null,
      quantity_2: input.quantity2 || null,
      inbound_no: input.inboundNo || null,
      shipping_date: input.shippingDate || null,
      shipping_slip_text: input.shippingSlipText || null,
      shipping_slip_text_edited: input.shippingSlipTextEdited,
      jiku_code: input.jikuCode || null,
      material_code: input.materialCode || null,
      delivery_quantity: input.deliveryQuantity || null,
      delivery_date: input.deliveryDate || null,
    }),
    [],
  );

  const saveEditMutation = useMutation({
    mutationFn: async ({
      rowId,
      payload,
    }: {
      rowId: number;
      payload: OcrResultEditPayload;
      refreshMaster: boolean;
    }) => ocrResultsApi.saveEdit(rowId, payload),
    onSuccess: async (_data, variables) => {
      if (variables.refreshMaster) {
        await queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
      }
    },
    onError: (error) => {
      console.error("Failed to save OCR edits:", error);
      toast.error("OCR入力内容の保存に失敗しました");
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["ocr-results", { taskDate, statusFilter, showErrorsOnly }],
    enabled: Boolean(token),
    queryFn: () =>
      ocrResultsApi.list({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
        has_error: showErrorsOnly || undefined,
      }),
  });

  const flushPendingEdits = useCallback(async () => {
    const timers = saveTimersRef.current;
    if (timers.size === 0) return;

    const rowMap = new Map((data?.items ?? []).map((row) => [row.id, row]));
    const pendingIds = Array.from(timers.keys());

    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();

    await Promise.all(
      pendingIds.map(async (rowId) => {
        const row = rowMap.get(rowId);
        const input = rowInputs[rowId];
        if (!row || !input) return;

        const refreshMaster = refreshMasterRef.current.has(rowId);
        refreshMasterRef.current.delete(rowId);

        await saveEditMutation.mutateAsync({
          rowId,
          payload: buildPayload(input),
          refreshMaster,
        });
      }),
    );
  }, [buildPayload, data?.items, rowInputs, saveEditMutation]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await flushPendingEdits();
      await ocrResultsApi.exportExcel({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
        has_error: showErrorsOnly || undefined,
      });
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Excelエクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  // エラー件数をカウント
  const errorCount = data?.items.filter((item) => item.has_error).length ?? 0;

  const getInputs = useCallback(
    (row: OcrResultItem) => rowInputs[row.id] ?? buildRowDefaults(row),
    [rowInputs],
  );

  const persistEdits = useCallback(
    (row: OcrResultItem, input: RowInputState) => {
      const refreshMaster = refreshMasterRef.current.has(row.id);
      refreshMasterRef.current.delete(row.id);
      saveEditMutation.mutate({
        rowId: row.id,
        payload: buildPayload(input),
        refreshMaster,
      });
    },
    [buildPayload, saveEditMutation],
  );

  const scheduleSave = useCallback(
    (row: OcrResultItem, input: RowInputState) => {
      const existing = saveTimersRef.current.get(row.id);
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(() => {
        persistEdits(row, input);
      }, 800);
      saveTimersRef.current.set(row.id, timer);
    },
    [persistEdits],
  );

  const updateInputs = useCallback(
    (row: OcrResultItem, patch: Partial<RowInputState>) => {
      if ("materialCode" in patch || "jikuCode" in patch) {
        refreshMasterRef.current.add(row.id);
      }
      setRowInputs((prev) => {
        const current = prev[row.id] ?? buildRowDefaults(row);
        const next = {
          ...current,
          ...patch,
        };
        scheduleSave(row, next);
        return {
          ...prev,
          [row.id]: next,
        };
      });
    },
    [scheduleSave],
  );

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const contextValue = useMemo(() => ({ getInputs, updateInputs }), [getInputs, updateInputs]);

  const columns = useMemo<Column<OcrResultItem>[]>(
    () => [
      {
        id: "status_icon",
        header: "ステータス",
        accessor: (row) => <StatusIcon row={row} />,
        minWidth: 80,
      },
      {
        id: "lot_entry_1",
        header: (
          <div className="flex flex-col leading-tight py-1">
            <span className="text-xs font-semibold">ロットNo(1)</span>
            <span className="text-[10px] font-normal text-slate-500">数量(1)</span>
          </div>
        ),
        accessor: (row) => <LotEntryCell row={row} lotField="lotNo1" quantityField="quantity1" />,
        minWidth: 160,
      },
      {
        id: "lot_entry_2",
        header: (
          <div className="flex flex-col leading-tight py-1">
            <span className="text-xs font-semibold">ロットNo(2)</span>
            <span className="text-[10px] font-normal text-slate-500">数量(2)</span>
          </div>
        ),
        accessor: (row) => <LotEntryCell row={row} lotField="lotNo2" quantityField="quantity2" />,
        minWidth: 160,
      },
      {
        id: "inbound_no_input",
        header: "入庫No",
        accessor: (row) => <EditableTextCell row={row} field="inboundNo" />,
        minWidth: 120,
      },
      {
        id: "shipping_date_input",
        header: "出荷日",
        accessor: (row) => <EditableDateCell row={row} field="shippingDate" />,
        minWidth: 120,
      },
      {
        id: "shipping_slip_text_input",
        header: "出荷票テキスト",
        accessor: (row) => <EditableShippingSlipCell row={row} />,
        minWidth: 320,
        className: "align-top",
      },
      {
        id: "shipping_slip_source",
        header: "取得元",
        accessor: () => <span className="text-xs text-gray-600">OCR</span>,
        minWidth: 80,
      },
      {
        id: "material_code",
        header: "材質コード",
        accessor: (row) => (
          <EditableTextCell
            row={row}
            field="materialCode"
            inputClassName={row.master_not_found ? "border-red-300 bg-red-50" : ""}
          />
        ),
        minWidth: 120,
      },
      {
        id: "jiku_code",
        header: "次区",
        accessor: (row) => (
          <EditableTextCell
            row={row}
            field="jikuCode"
            inputClassName={row.jiku_format_error ? "border-red-300 bg-red-50" : ""}
          />
        ),
        minWidth: 100,
      },
      {
        id: "delivery_date",
        header: "納期",
        accessor: (row) => <EditableDateCell row={row} field="deliveryDate" />,
        minWidth: 110,
      },
      {
        id: "delivery_quantity",
        header: "納入量",
        accessor: (row) => (
          <EditableTextCell row={row} field="deliveryQuantity" inputClassName="text-right" />
        ),
        minWidth: 100,
      },
      {
        id: "sap_match_status",
        header: "SAPマッチ",
        accessor: (row) => <SapMatchIcon row={row} />,
        minWidth: 130,
      },
      {
        id: "sap_supplier",
        header: "SAP仕入先",
        accessor: (row) => {
          if (!row.sap_supplier_code) return "-";
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium">{row.sap_supplier_code}</span>
              {row.sap_supplier_name && (
                <span className="text-[10px] text-gray-500">{row.sap_supplier_name}</span>
              )}
            </div>
          );
        },
        minWidth: 130,
      },
      {
        id: "sap_qty_unit",
        header: "SAP数量単位",
        accessor: (row) => row.sap_qty_unit || "-",
        minWidth: 110,
      },
      {
        id: "sap_maker_item",
        header: "SAPメーカー品番",
        accessor: (row) => row.sap_maker_item || "-",
        minWidth: 150,
      },
      {
        id: "item_no",
        header: "アイテムNo",
        accessor: (row) => formatItemNo(row.item_no),
        minWidth: 100,
      },
      {
        id: "customer_part_no",
        header: "先方品番",
        accessor: (row) => row.customer_part_no || "-",
        minWidth: 120,
      },
      {
        id: "maker_part_no",
        header: "メーカー品番",
        accessor: (row) => row.maker_part_no || "-",
        minWidth: 130,
      },
      {
        id: "order_unit",
        header: "数量単位",
        accessor: (row) => row.order_unit || "-",
        minWidth: 90,
      },
      {
        id: "customer_code",
        header: "得意先",
        accessor: (row) => row.customer_code || "-",
        minWidth: 110,
      },
      {
        id: "supplier_code",
        header: "仕入先",
        accessor: (row) => row.supplier_code || "-",
        minWidth: 110,
      },
      {
        id: "supplier_name",
        header: "仕入先名称",
        accessor: (row) => row.supplier_name || "-",
        minWidth: 140,
      },
      {
        id: "shipping_warehouse_code",
        header: "出荷倉庫",
        accessor: (row) => row.shipping_warehouse_code || "-",
        minWidth: 110,
      },
      {
        id: "shipping_warehouse_name",
        header: "出荷倉庫名称",
        accessor: (row) => row.shipping_warehouse_name || "-",
        minWidth: 140,
      },
      {
        id: "delivery_place_code",
        header: "納入場所",
        accessor: (row) => row.delivery_place_code || "-",
        minWidth: 120,
      },
      {
        id: "delivery_place_name",
        header: "納入場所名称",
        accessor: (row) => row.delivery_place_name || "-",
        minWidth: 140,
      },
      {
        id: "remarks",
        header: "備考",
        accessor: (row) => getContentValue(row, "備考"),
        minWidth: 160,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="OCR結果" subtitle="OCR受注登録で生成されたデータ一覧（リアルタイム）" />

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="task-date" className="block text-sm font-medium text-gray-700 mb-1">
                タスク日付
              </label>
              <input
                id="task-date"
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">全て</option>
                <option value="PENDING">保留中</option>
                <option value="IMPORTED">インポート済み</option>
                <option value="ERROR">エラー</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showErrorsOnly}
                  onChange={(e) => setShowErrorsOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">エラーのみ表示</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{data && `${data.total}件のデータ`}</span>
          {errorCount > 0 && (
            <span className="text-sm text-red-600 font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {errorCount}件のエラー
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
              toast.success("データを再読み込みしました");
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            再読み込み
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "エクスポート中..." : "Excelエクスポート"}
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="p-0">
          <OcrInputsContext.Provider value={contextValue}>
            {/* ステータス凡例 - テーブルヘッダー上部に配置 */}
            <div className="px-4 pt-4 pb-2 border-b bg-gray-50/50">
              <StatusLegend />
            </div>

            {error ? (
              <div className="p-8 text-center text-destructive">
                エラーが発生しました: {error.message}
              </div>
            ) : (
              <DataTable
                data={data?.items || []}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="OCR結果データがありません"
                enableVirtualization
                getRowClassName={getRowClassName}
              />
            )}
          </OcrInputsContext.Provider>
        </CardContent>
      </Card>
    </div>
  );
}
