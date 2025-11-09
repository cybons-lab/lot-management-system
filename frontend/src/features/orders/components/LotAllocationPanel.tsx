import * as React from "react";

// frontend/src/features/orders/components/LotAllocationPanel.tsx
import { Progress } from "@/components/ui/progress";
import { formatCodeAndName } from "@/lib/utils";
import type { LotCandidate, WarehouseAlloc } from "@/types/aliases";

type Props = {
  /** 表示モード。既定は 'modal'（後方互換） */
  mode?: "inline" | "modal";

  /** modal のときだけ有効。inline のときは無視 */
  open?: boolean;
  onClose?: () => void;

  /** 受注明細の ID（表示用） */
  orderLineId: number | null;

  /** 引当候補ロット */
  candidates: LotCandidate[];

  /** ロット引当実行 */
  onAllocate: (payload: { items: { lot_id: number; qty: number }[] }) => void;

  /** 引当取消 */
  onCancelAllocations: (payload: unknown) => void;

  /** 倉庫別配分の保存 */
  onSaveWarehouseAllocations: (allocs: WarehouseAlloc[]) => void;

  /** 行の最大数量（配分超過チェックに使用） */
  maxQty?: number;

  /** トースト表示関数（オプション） */
  onToast?: (message: { title: string; variant?: "default" | "destructive" }) => void;
};

/**
 * 倉庫配分のバリデーション
 */
const validateWarehouseAllocations = (
  allocs: WarehouseAlloc[],
  maxQty?: number,
): { valid: boolean; message: string } => {
  const total = allocs.reduce((sum, a) => sum + Number(a.quantity ?? 0), 0);

  if (total === 0) {
    return { valid: false, message: "配分数量が0です" };
  }

  if (typeof maxQty === "number" && total > maxQty) {
    return {
      valid: false,
      message: `配分合計(${total})が行数量(${maxQty})を超えています`,
    };
  }

  return { valid: true, message: "" };
};

export function LotAllocationPanel(props: Props) {
  const {
    mode = "modal",
    open = true,
    onClose = () => {},
    orderLineId,
    candidates,
    onAllocate,
    onCancelAllocations,
    onSaveWarehouseAllocations,
    maxQty,
    onToast,
  } = props;

  // 入力状態
  const [selected, setSelected] = React.useState<Record<number, number>>({}); // lotId -> qty
  const [wareAlloc, setWareAlloc] = React.useState<WarehouseAlloc[]>([]);
  const [validationError, setValidationError] = React.useState<string>("");

  const totalSelected = React.useMemo(
    () => Object.values(selected).reduce((sum, value) => sum + Number(value || 0), 0),
    [selected],
  );
  const requiredQty = typeof maxQty === "number" ? maxQty : 0;
  const progressPct =
    requiredQty > 0
      ? Math.min(100, Math.max(0, Math.round((totalSelected / requiredQty) * 100)))
      : 0;
  const remainingQty = requiredQty > 0 ? Math.max(0, requiredQty - totalSelected) : undefined;
  const isOverAllocated = typeof maxQty === "number" && totalSelected > (maxQty ?? 0);

  React.useEffect(() => {
    setSelected({});
    setValidationError("");
  }, [orderLineId, candidates]);

  // modal のときだけ open を判定
  if (mode === "modal" && !open) return null;

  // 引当実行のハンドラ
  const handleAllocate = () => {
    const sum = Object.values(selected).reduce((s, q) => s + Number(q || 0), 0);
    if (sum <= 0) {
      const msg = "引当数が0です";
      setValidationError(msg);
      onToast?.({ title: msg, variant: "destructive" });
      return;
    }
    if (typeof maxQty === "number" && sum > maxQty) {
      const msg = `引当合計(${sum})が要求数量(${maxQty})を超えています`;
      setValidationError(msg);
      onToast?.({ title: msg, variant: "destructive" });
      return;
    }
    const items = Object.entries(selected)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([lot_id, qty]) => ({
        lot_id: Number(lot_id),
        qty: Number(qty),
      }));

    setValidationError("");
    onAllocate({ items });
    onToast?.({ title: "引当を実行しました" });
  };

  // 倉庫配分保存のハンドラ
  const handleSaveWarehouseAlloc = () => {
    const validation = validateWarehouseAllocations(wareAlloc, maxQty);

    if (!validation.valid) {
      setValidationError(validation.message);
      onToast?.({ title: validation.message, variant: "destructive" });
      return;
    }

    setValidationError("");
    onSaveWarehouseAllocations(wareAlloc);
    onToast?.({ title: "倉庫配分を保存しました" });
  };

  // 共通 UI 本体
  const body = (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">行ID: {orderLineId ?? "-"}</div>
        {mode === "modal" && (
          <button
            className="px-3 py-1 rounded border hover:bg-gray-100"
            onClick={() => onClose && onClose()}
          >
            閉じる
          </button>
        )}
      </div>

      {/* バリデーションエラー表示 */}
      {validationError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠️ {validationError}
        </div>
      )}

      {/* 候補ロット一覧 */}
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium mb-2">引当候補ロット</div>
        {candidates.length === 0 ? (
          <div className="text-sm text-gray-500">候補ロットがありません</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">LotID</th>
                  <th className="py-1">ロット番号</th>
                  <th className="py-1">倉庫</th>
                  <th className="py-1">在庫数</th>
                  <th className="py-1">引当数</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.lot_id} className="border-t">
                    <td className="py-1">{c.lot_id}</td>
                    <td className="py-1">{c.lot_code}</td>
                    <td className="py-1">
                      {formatCodeAndName(c.warehouse_code, c.warehouse_name) || "—"}
                    </td>
                    <td className="py-1">
                      {c.available_qty} {c.base_unit}
                      {typeof c.lot_unit_qty === "number" &&
                        c.lot_unit &&
                        c.lot_unit !== c.base_unit && (
                          <span className="text-gray-400">
                            {` (${c.lot_unit_qty} ${c.lot_unit})`}
                          </span>
                        )}
                    </td>
                    <td className="py-1">
                      <input
                        className="border rounded px-2 py-0.5 w-24"
                        type="number"
                        min={0}
                        max={c.available_qty ?? undefined}
                        value={Number(selected[c.lot_id ?? 0] ?? 0)}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [Number(c.lot_id)]: Number(e.target.value),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {typeof maxQty === "number" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>引当合計</span>
                  <span>
                    <span className="font-semibold">{totalSelected}</span>
                    {` / ${maxQty}`}
                  </span>
                </div>
                <Progress value={progressPct} />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>進捗</span>
                  <span>
                    {progressPct}%{typeof remainingQty === "number" && ` (残り ${remainingQty})`}
                  </span>
                </div>
                {isOverAllocated && (
                  <div className="text-xs text-red-600">引当合計が要求数量を超えています。</div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                className="px-3 py-1 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAllocate}
                disabled={isOverAllocated}
              >
                引当を実行
              </button>

              <button
                className="px-3 py-1 rounded border hover:bg-gray-100"
                onClick={() => {
                  onCancelAllocations({ order_line_id: orderLineId });
                  onToast?.({ title: "引当を取消しました" });
                }}
              >
                引当を取消
              </button>
            </div>
          </>
        )}
      </div>

      {/* 倉庫別配分 */}
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium mb-2">
          倉庫別配分
          {typeof maxQty === "number" && (
            <span className="ml-2 text-xs text-gray-500">(最大: {maxQty})</span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <button
            className="px-3 py-1 rounded border hover:bg-gray-100"
            onClick={() =>
              setWareAlloc([
                ...(wareAlloc ?? []),
                {
                  warehouse_id: 1,
                  lot_id: 0,
                  qty: 0,
                  warehouse_code: "",
                  warehouse_name: "",
                  quantity: 0,
                } as WarehouseAlloc,
              ])
            }
          >
            + 行追加
          </button>

          <button
            className="px-3 py-1 rounded bg-black text-white hover:bg-gray-800"
            onClick={handleSaveWarehouseAlloc}
          >
            保存
          </button>
        </div>

        {/* 配分合計の表示 */}
        {wareAlloc.length > 0 && (
          <div className="mb-2 text-sm text-gray-600">
            配分合計:{" "}
            <span className="font-semibold">
              {wareAlloc.reduce((s, a) => s + Number(a.quantity ?? 0), 0)}
            </span>
            {typeof maxQty === "number" && ` / ${maxQty}`}
          </div>
        )}

        <div className="space-y-2">
          {(wareAlloc ?? []).map((wa, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className="border rounded px-2 py-0.5 w-24"
                type="number"
                placeholder="倉庫ID"
                value={wa.warehouse_id ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWareAlloc((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, warehouse_id: v } : x)),
                  );
                }}
              />
              <input
                className="border rounded px-2 py-0.5 w-36"
                type="text"
                placeholder="倉庫コード/名称"
                value={formatCodeAndName(wa.warehouse_code ?? "", wa.warehouse_name)}
                onChange={(e) => {
                  const value = e.target.value;
                  const [codePart, namePart] = value.trim().split(/\s+/, 2);
                  setWareAlloc((arr) =>
                    arr.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            warehouse_code: codePart ?? "",
                            warehouse_name: namePart ?? x.warehouse_name,
                          }
                        : x,
                    ),
                  );
                }}
              />
              <input
                className="border rounded px-2 py-0.5 w-24"
                type="number"
                placeholder="数量"
                min={0}
                value={wa.quantity ?? wa.qty ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWareAlloc((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, quantity: v, qty: v } : x)),
                  );
                }}
              />
              <button
                className="px-2 py-0.5 rounded border hover:bg-gray-100"
                onClick={() => setWareAlloc((arr) => arr.filter((_, i) => i !== idx))}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ラッパー（modal / inline）
  if (mode === "modal") {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white w-[860px] max-h-[80vh] overflow-auto rounded-2xl p-4 shadow-xl">
          {body}
        </div>
      </div>
    );
  }

  // inline
  return <div className="rounded-lg border p-3 bg-violet-50/20">{body}</div>;
}
