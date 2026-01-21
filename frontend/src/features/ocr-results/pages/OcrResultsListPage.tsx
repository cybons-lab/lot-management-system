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
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle, Download, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { ocrResultsApi, type OcrResultItem } from "../api";

import { Button, Card, CardContent } from "@/components/ui";
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
 * エラーメッセージを生成
 */
function getErrorMessage(row: OcrResultItem): string {
  const errors: string[] = [];
  if (row.status === "ERROR" && row.error_reason) {
    errors.push(row.error_reason);
  }
  if (row.master_not_found) {
    errors.push("マスタ未登録");
  }
  if (row.jiku_format_error) {
    errors.push("次区フォーマットエラー");
  }
  if (row.date_format_error) {
    errors.push("日付フォーマットエラー");
  }
  return errors.length > 0 ? errors.join(", ") : "-";
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
};

const buildRowDefaults = (row: OcrResultItem): RowInputState => ({
  lotNo1: row.lot_no || "",
  quantity1: "",
  lotNo2: "",
  quantity2: "",
  inboundNo: row.inbound_no || "",
  shippingDate: "",
  shippingSlipText: "",
  shippingSlipTextEdited: false,
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
}: {
  row: OcrResultItem;
  field: Extract<keyof RowInputState, string>; // Ensure we only use keys that have string values
  placeholder?: string;
  inputClassName?: string;
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
        "w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
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

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => updateInputs(row, { [field]: e.target.value })}
      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

/**
 * セルコンポーネント: 読取専用プレビュー
 */
function EditableShippingSlipCell({ row }: { row: OcrResultItem }) {
  const { getInputs, updateInputs } = useOcrInputs();
  const input = getInputs(row);
  const computedText = buildShippingSlipText(row.shipping_slip_text, input);
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
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <EditableTextCell row={row} field={lotField} placeholder="ロットNo" />
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-400 shrink-0 w-8">数量:</span>
        <EditableTextCell
          row={row}
          field={quantityField}
          placeholder="数量"
          inputClassName="w-[70px] text-right"
        />
      </div>
    </div>
  );
}

const formatItemNo = (itemNo: string | null) => {
  if (!itemNo) return "-";
  return itemNo.length > 6 ? itemNo.slice(-6) : itemNo;
};

const buildShippingSlipText = (template: string | null, input: RowInputState): string => {
  if (!template) return "";

  const lotEntries = [
    input.lotNo1 ? `${input.lotNo1}（${input.quantity1 || ""}）` : "",
    input.lotNo2 ? `${input.lotNo2}（${input.quantity2 || ""}）` : "",
  ].filter(Boolean);
  const lotString = lotEntries.join("・");

  return template.replace("ロット番号(数量)", lotString).replace("入庫番号", input.inboundNo || "");
};

// ============================================
// Main Page Component
// ============================================

export function OcrResultsListPage() {
  const [taskDate, setTaskDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rowInputs, setRowInputs] = useState<Record<number, RowInputState>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["ocr-results", { taskDate, statusFilter, showErrorsOnly }],
    queryFn: () =>
      ocrResultsApi.list({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
        has_error: showErrorsOnly || undefined,
      }),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await ocrResultsApi.exportExcel({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
      });
    } catch (err) {
      console.error("Export failed:", err);
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

  const updateInputs = useCallback((row: OcrResultItem, patch: Partial<RowInputState>) => {
    setRowInputs((prev) => {
      const current = prev[row.id] ?? buildRowDefaults(row);
      return {
        ...prev,
        [row.id]: {
          ...current,
          ...patch,
        },
      };
    });
  }, []);

  const contextValue = useMemo(() => ({ getInputs, updateInputs }), [getInputs, updateInputs]);

  const columns = useMemo<Column<OcrResultItem>[]>(
    () => [
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
        id: "status_icon",
        header: "",
        accessor: (row) => <StatusIcon row={row} />,
        minWidth: 40,
      },
      {
        id: "id",
        header: "ID",
        accessor: (row) => row.id,
        minWidth: 60,
      },
      {
        id: "task_date",
        header: "タスク日付",
        accessor: (row) => row.task_date,
        minWidth: 110,
      },
      {
        id: "customer_code",
        header: "得意先コード",
        accessor: (row) => row.customer_code || "-",
        minWidth: 110,
      },
      {
        id: "customer_name",
        header: "得意先名",
        accessor: (row) => row.customer_name || "-",
        minWidth: 140,
      },
      {
        id: "material_code",
        header: "材質コード",
        accessor: (row) => (
          <span className={row.master_not_found ? "text-red-600 font-medium" : ""}>
            {row.material_code || "-"}
          </span>
        ),
        minWidth: 100,
      },
      {
        id: "jiku_code",
        header: "次区",
        accessor: (row) => (
          <span className={row.jiku_format_error ? "text-red-600 font-medium" : ""}>
            {row.jiku_code || "-"}
          </span>
        ),
        minWidth: 80,
      },
      {
        id: "delivery_date",
        header: "納期",
        accessor: (row) => (
          <span className={row.date_format_error ? "text-red-600 font-medium" : ""}>
            {row.delivery_date || "-"}
          </span>
        ),
        minWidth: 100,
      },
      {
        id: "delivery_quantity",
        header: "納入量",
        accessor: (row) => row.delivery_quantity || "-",
        minWidth: 80,
      },
      {
        id: "item_no",
        header: "アイテム",
        accessor: (row) => formatItemNo(row.item_no),
        minWidth: 100,
      },
      {
        id: "order_unit",
        header: "受注単位",
        accessor: (row) => row.order_unit || "-",
        minWidth: 90,
      },
      {
        id: "inbound_no",
        header: "入庫No(OCR)",
        accessor: (row) => row.inbound_no || "-",
        minWidth: 110,
      },
      {
        id: "lot_no",
        header: "Lot No(OCR)",
        accessor: (row) => row.lot_no || "-",
        minWidth: 110,
      },
      {
        id: "supplier_code",
        header: "仕入先コード",
        accessor: (row) => row.supplier_code || "-",
        minWidth: 110,
      },
      {
        id: "supplier_name",
        header: "仕入先名",
        accessor: (row) => row.supplier_name || "-",
        minWidth: 140,
      },
      {
        id: "delivery_place_name",
        header: "納入先",
        accessor: (row) => row.delivery_place_name || "-",
        minWidth: 140,
      },
      {
        id: "error_message",
        header: "エラー",
        accessor: (row) => (
          <span className={row.has_error ? "text-red-600" : "text-gray-400"}>
            {getErrorMessage(row)}
          </span>
        ),
        minWidth: 150,
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
