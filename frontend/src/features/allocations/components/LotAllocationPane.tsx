/**
 * LotAllocationPane - Right pane for lot candidates and warehouse allocations
 * - 倉庫サマリを Pane 内で確実に計算（propsが来ていればそれを優先）
 * - 在庫表示は free_qty ?? current_quantity を数値化
 */

import { Fragment } from "react";

import type { OrderLine } from "../types";
import { toQty } from "../utils/qty";

import type { CandidateLotItem } from "@/features/allocations/api";
import { formatDate } from "@/shared/utils/date";

interface LotAllocationPaneProps {
  selectedLineId: number | null;
  selectedLine: OrderLine | undefined;
  isLoading: boolean;
  error: Error | null;
  candidateLots: CandidateLotItem[];
  lotAllocations: Record<number, number>;
  allocationTotalAll: number;
  canSave: boolean;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
  onSaveAllocations: () => void;
}

export function LotAllocationPane({
  selectedLineId,
  selectedLine,
  isLoading,
  error,
  candidateLots,
  lotAllocations,
  allocationTotalAll,
  canSave,
  onLotAllocationChange,
  onSaveAllocations,
}: LotAllocationPaneProps) {
  if (!selectedLineId || !selectedLine) {
    return (
      <div className="w-[420px] overflow-y-auto border-l bg-white">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
          中央ペインから明細を選択してください
        </div>
      </div>
    );
  }

  return (
    <div className="w-[420px] overflow-y-auto border-l bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">ロット配分</h3>
          <p className="mt-1 text-xs text-gray-600">
            {selectedLine.product_code ? (
              <Fragment>
                <span className="font-medium">{selectedLine.product_code}</span>
                {selectedLine.product_name ? ` / ${selectedLine.product_name}` : ""}
              </Fragment>
            ) : (
              selectedLine.product_name || "製品情報なし"
            )}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              候補ロットを読み込み中...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-center text-sm font-semibold text-red-800">
                候補ロットの取得に失敗しました
              </p>
              <p className="mt-1 text-center text-xs text-red-600">
                {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
              </p>
            </div>
          ) : (candidateLots?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-gray-600">候補ロットがありません</p>
              <p className="mt-1 text-xs text-gray-400">この製品の在庫が存在しません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidateLots.map((lot) => {
                // lot_id を正とする
                const lotId = lot.lot_id;
                if (lotId == null) return null;

                // 在庫数量
                const availableQty = toQty(lot.free_qty ?? lot.current_quantity);
                const totalStock = toQty(lot.current_quantity);

                const allocatedQty = lotAllocations[lotId] ?? 0;
                const lotLabel = lot.lot_number ?? `LOT-${lotId}`;

                const deliveryCode = lot.delivery_place_code ?? null;
                const deliveryName = lot.delivery_place_name ?? null;
                const deliveryDisplay =
                  deliveryCode && deliveryName
                    ? `${deliveryCode} / ${deliveryName}`
                    : (deliveryCode ?? deliveryName ?? "-");

                return (
                  <div
                    key={lotId}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{lotLabel}</p>
                        <dl className="mt-2 space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">納品先</dt>
                            <dd className="font-medium text-gray-700">{deliveryDisplay}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">期限</dt>
                            <dd className="font-medium text-gray-700">
                              {formatDate(lot.expiry_date, { fallback: "—" })}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="text-right text-xs text-gray-600">
                        <div>在庫数量</div>
                        <div className="mt-1 text-lg font-semibold text-blue-600">
                          {availableQty.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          現在庫: {totalStock.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label
                        className="block text-xs font-medium text-gray-700"
                        htmlFor={`lot-allocation-${lotId}`}
                      >
                        このロットから引当
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id={`lot-allocation-${lotId}`}
                          type="number"
                          min={0}
                          max={availableQty}
                          value={allocatedQty}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            onLotAllocationChange(lotId, Number.isFinite(parsed) ? parsed : 0);
                          }}
                          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // DDL v2.2: prefer order_quantity, fallback to quantity
                            const totalNeeded = Number(
                              selectedLine?.order_quantity ?? selectedLine?.quantity ?? 0,
                            );
                            const otherLotsTotal = allocationTotalAll - allocatedQty;
                            const remainingNeeded = Math.max(0, totalNeeded - otherLotsTotal);
                            const maxAllocation = Math.min(remainingNeeded, availableQty);
                            onLotAllocationChange(lotId, maxAllocation);
                          }}
                          className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium whitespace-nowrap text-gray-700 transition hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
                        >
                          全量
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t bg-white px-4 py-3 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span>配分合計</span>
            <span className="font-semibold">{allocationTotalAll.toLocaleString()}</span>
          </div>
          <button
            className="mt-3 w-full rounded bg-black py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSaveAllocations}
            disabled={!canSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
