/**
 * LotCandidatesAndAllocationPane - 右ペイン（ロット候補＋引当入力）
 *
 * 表示内容:
 * - ロット候補一覧（FEFO順）
 * - 各ロットの引当数量入力
 * - 全量ボタン
 * - 引当サマリー
 * - 自動引当（FEFO）、クリア、引当を登録ボタン
 */

import { useMemo } from "react";

import type { CandidateLotItem } from "../api";

import type { components } from "@/types/api";

type OrderLineResponse = components["schemas"]["OrderLineResponse"];

interface LotCandidatesAndAllocationPaneProps {
  selectedLine: OrderLineResponse | undefined;
  candidateLots: CandidateLotItem[];
  isLoadingCandidates: boolean;
  candidatesError: Error | null;
  lotAllocations: Record<number, number>;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onCommitAllocation: () => void;
  isCommitting: boolean;
}

export function LotCandidatesAndAllocationPane({
  selectedLine,
  candidateLots,
  isLoadingCandidates,
  candidatesError,
  lotAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onCommitAllocation,
  isCommitting,
}: LotCandidatesAndAllocationPaneProps) {
  // 引当合計を計算
  const allocationTotal = useMemo(() => {
    return Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0);
  }, [lotAllocations]);

  // 受注数量
  const orderQuantity = selectedLine ? parseFloat(String(selectedLine.order_quantity ?? 0)) : 0;

  // 残り必要数量
  const remainingQuantity = orderQuantity - allocationTotal;

  // 状態判定
  const allocationStatus = useMemo(() => {
    if (remainingQuantity > 0) return "shortage"; // 不足
    if (remainingQuantity === 0) return "exact"; // ちょうど
    return "over"; // 過多
  }, [remainingQuantity]);

  // 保存可能かどうか
  const canSave = useMemo(() => {
    return allocationTotal > 0 && allocationStatus !== "over" && !isCommitting;
  }, [allocationTotal, allocationStatus, isCommitting]);

  if (!selectedLine) {
    return (
      <div className="flex-1 bg-white">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
          左ペインから受注明細を選択してください
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* ヘッダー */}
      <div className="border-b bg-white px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">ロット引当</h3>
        <p className="mt-1 text-xs text-gray-600">
          製品ID: {selectedLine.product_id} / 受注数量: {orderQuantity.toLocaleString()}{" "}
          {selectedLine.unit}
        </p>
      </div>

      {/* ロット候補一覧 */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoadingCandidates ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            候補ロットを読み込み中...
          </div>
        ) : candidatesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-center text-sm font-semibold text-red-800">
              候補ロットの取得に失敗しました
            </p>
            <p className="mt-1 text-center text-xs text-red-600">{candidatesError.message}</p>
          </div>
        ) : candidateLots.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-gray-600">候補ロットがありません</p>
            <p className="mt-1 text-xs text-gray-400">この製品の在庫が存在しません</p>
          </div>
        ) : (
          candidateLots.map((lot) => {
            const allocatedQty = lotAllocations[lot.lot_id] ?? 0;
            const freeQty = lot.free_qty ?? 0;

            return (
              <LotCandidateCard
                key={lot.lot_id}
                lot={lot}
                allocatedQty={allocatedQty}
                freeQty={freeQty}
                remainingQuantity={remainingQuantity}
                allocationTotal={allocationTotal}
                onLotAllocationChange={onLotAllocationChange}
              />
            );
          })
        )}
      </div>

      {/* フッター（サマリー＋ボタン） */}
      <div className="border-t bg-white px-4 py-3">
        {/* サマリー */}
        <div className="mb-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">受注数量</span>
            <span className="font-medium text-gray-900">
              {orderQuantity.toLocaleString()} {selectedLine.unit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">引当合計</span>
            <span className="font-semibold text-blue-600">
              {allocationTotal.toLocaleString()} {selectedLine.unit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">残り必要数量</span>
            <span
              className={`font-semibold ${
                allocationStatus === "exact"
                  ? "text-green-600"
                  : allocationStatus === "shortage"
                    ? "text-orange-600"
                    : "text-red-600"
              }`}
            >
              {remainingQuantity.toLocaleString()} {selectedLine.unit}
            </span>
          </div>
          <div className="pt-1">
            <span
              className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                allocationStatus === "exact"
                  ? "bg-green-100 text-green-700"
                  : allocationStatus === "shortage"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {allocationStatus === "exact"
                ? "ちょうど"
                : allocationStatus === "shortage"
                  ? "不足"
                  : "引当過多"}
            </span>
          </div>
        </div>

        {/* ボタン群 */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAutoAllocate}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoadingCandidates || candidateLots.length === 0}
            >
              自動引当（FEFO）
            </button>
            <button
              type="button"
              onClick={onClearAllocations}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={allocationTotal === 0}
            >
              クリア
            </button>
          </div>
          <button
            type="button"
            onClick={onCommitAllocation}
            className="w-full rounded bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSave}
          >
            {isCommitting ? "保存中..." : "引当を登録"}
          </button>
        </div>

        {allocationStatus === "over" && (
          <p className="mt-2 text-xs text-red-600">
            引当数量が受注数量を超えています。調整してください。
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * LotCandidateCard - ロット候補カード
 */
interface LotCandidateCardProps {
  lot: CandidateLotItem;
  allocatedQty: number;
  freeQty: number;
  remainingQuantity: number;
  allocationTotal: number;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
}

function LotCandidateCard({
  lot,
  allocatedQty,
  freeQty,
  remainingQuantity,
  onLotAllocationChange,
}: LotCandidateCardProps) {
  const handleMaxAllocation = () => {
    const remainingNeeded = Math.max(0, remainingQuantity + allocatedQty);
    const maxAllocation = Math.min(remainingNeeded, freeQty);
    onLotAllocationChange(lot.lot_id, maxAllocation);
  };

  const expiryDate = lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString("ja-JP") : "—";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{lot.lot_number}</p>
          <dl className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <dt className="text-gray-500">賞味期限</dt>
              <dd className="font-medium text-gray-700">{expiryDate}</dd>
            </div>
            {lot.delivery_place_code && (
              <div className="flex justify-between">
                <dt className="text-gray-500">納品先</dt>
                <dd className="font-medium text-gray-700">
                  {lot.delivery_place_code}
                  {lot.delivery_place_name ? ` / ${lot.delivery_place_name}` : ""}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="text-right text-xs text-gray-600">
          <div>在庫数量</div>
          <div className="mt-1 text-lg font-semibold text-blue-600">{freeQty.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3">
        <label
          className="block text-xs font-medium text-gray-700"
          htmlFor={`lot-allocation-${lot.lot_id}`}
        >
          このロットから引当
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`lot-allocation-${lot.lot_id}`}
            type="number"
            min={0}
            max={freeQty}
            value={allocatedQty}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              const clamped = Math.max(0, Math.min(freeQty, Number.isFinite(parsed) ? parsed : 0));
              onLotAllocationChange(lot.lot_id, clamped);
            }}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleMaxAllocation}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium whitespace-nowrap text-gray-700 transition hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
          >
            全量
          </button>
        </div>
      </div>
    </div>
  );
}
