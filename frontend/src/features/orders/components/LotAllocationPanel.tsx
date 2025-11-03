// frontend/src/features/orders/components/LotAllocationPanel.tsx
import React from "react";
import type { LotCandidate, WarehouseAlloc } from "@/types";

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

  /** 引当取消（型は後続で厳密化予定） */
  onCancelAllocations: (payload: any) => void;

  /** 倉庫別配分の保存 */
  onSaveWarehouseAllocations: (allocs: WarehouseAlloc[]) => void;

  /** 行の最大数量（配分超過チェックに使用・任意） */
  maxQty?: number;
};

export default function LotAllocationPanel(props: Props) {
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
  } = props;

  // 入力状態
  const [selected, setSelected] = React.useState<Record<number, number>>({}); // lotId -> qty
  const [wareAlloc, setWareAlloc] = React.useState<WarehouseAlloc[]>([]);

  // modal のときだけ open を判定
  if (mode === "modal" && !open) return null;

  // 共通 UI 本体
  const body = (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">行ID: {orderLineId ?? "-"}</div>
        {mode === "modal" && (
          <button
            className="px-3 py-1 rounded border"
            onClick={() => onClose && onClose()}>
            閉じる
          </button>
        )}
      </div>

      {/* 候補ロット一覧 */}
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium mb-2">引当候補ロット</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">LotID</th>
              <th className="py-1">ロット番号</th>
              <th className="py-1">在庫数</th>
              <th className="py-1">引当数</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.lot_id} className="border-t">
                <td className="py-1">{c.lot_id}</td>
                <td className="py-1">{c.lot_code}</td>
                <td className="py-1">{c.stock_qty}</td>
                <td className="py-1">
                  <input
                    className="border rounded px-2 py-0.5 w-24"
                    type="number"
                    min={0}
                    value={Number(selected[c.lot_id] ?? 0)}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [c.lot_id]: Number(e.target.value),
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-2 mt-3">
          <button
            className="px-3 py-1 rounded bg-black text-white"
            onClick={() => {
              const sum = Object.values(selected).reduce(
                (s, q) => s + Number(q || 0),
                0
              );
              if (sum <= 0) {
                alert("引当数が0です");
                return;
              }
              const items = Object.entries(selected)
                .filter(([, qty]) => Number(qty) > 0)
                .map(([lot_id, qty]) => ({
                  lot_id: Number(lot_id),
                  qty: Number(qty),
                }));
              onAllocate({ items });
            }}>
            引当を実行
          </button>

          <button
            className="px-3 py-1 rounded border"
            onClick={() => onCancelAllocations({ order_line_id: orderLineId })}>
            引当を取消
          </button>
        </div>
      </div>

      {/* 倉庫別配分 */}
      <div className="rounded-lg border p-3">
        <div className="text-sm text-gray-500 mb-1">倉庫別配分</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded border"
            onClick={() =>
              setWareAlloc([
                ...(wareAlloc ?? []),
                {
                  warehouse_id: 1,
                  lot_id: 0,
                  qty: 0,
                  warehouse_code: "",
                  quantity: 0,
                } as WarehouseAlloc,
              ])
            }>
            行追加
          </button>

          <button
            className="px-3 py-1 rounded bg-black text-white"
            onClick={() => {
              const total = (wareAlloc ?? []).reduce(
                (s, a) => s + Number(a?.quantity ?? a?.qty ?? 0),
                0
              );
              if (total <= 0) {
                alert("配分数量が0です");
                return;
              }
              if (typeof maxQty === "number" && total > maxQty) {
                alert("配分合計が行数量を超えています");
                return;
              }
              onSaveWarehouseAllocations(wareAlloc);
            }}>
            保存
          </button>
        </div>

        <div className="mt-3 space-y-2">
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
                    arr.map((x, i) =>
                      i === idx ? { ...x, warehouse_id: v } : x
                    )
                  );
                }}
              />
              <input
                className="border rounded px-2 py-0.5 w-28"
                type="text"
                placeholder="倉庫コード"
                value={wa.warehouse_code ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setWareAlloc((arr) =>
                    arr.map((x, i) =>
                      i === idx ? { ...x, warehouse_code: v } : x
                    )
                  );
                }}
              />
              <input
                className="border rounded px-2 py-0.5 w-24"
                type="number"
                placeholder="数量"
                value={wa.quantity ?? wa.qty ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWareAlloc((arr) =>
                    arr.map((x, i) =>
                      i === idx ? { ...x, quantity: v, qty: v } : x
                    )
                  );
                }}
              />
              <button
                className="px-2 py-0.5 rounded border"
                onClick={() =>
                  setWareAlloc((arr) => arr.filter((_, i) => i !== idx))
                }>
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
