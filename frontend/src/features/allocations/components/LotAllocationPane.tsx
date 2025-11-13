/**
 * LotAllocationPane - Right pane for lot candidates and warehouse allocations
 * - 倉庫サマリを Pane 内で確実に計算（propsが来ていればそれを優先）
 * - 在庫表示は free_qty ?? current_quantity を数値化
 */

import { useMemo } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { OrderLine, WarehouseSummary } from "../types";
import { toQty } from "../utils/qty";
import type { Lot as CandidateLot } from "@/hooks/useLotsQuery";
import { formatCodeAndName } from "@/shared/libs/utils";

interface LotAllocationPaneProps {
  selectedLineId: number | null;
  selectedLine: OrderLine | undefined;
  lotsQuery: UseQueryResult<CandidateLot[], Error>;
  candidateLots: CandidateLot[];
  /** 渡されなければ Pane 内で計算したものを使用 */
  warehouseSummaries?: WarehouseSummary[];
  warehouseAllocations: Record<string, number>;
  allocationTotalAll: number;
  canSave: boolean;
  onWarehouseAllocationChange: (key: string, value: number) => void;
  onSaveAllocations: () => void;
}

/** 倉庫サマリを candidateLots から計算（delivery_place 基準で集計） */
function computeWarehouseSummaries(lots: CandidateLot[]): WarehouseSummary[] {
  const map = new Map<string, WarehouseSummary>();

  for (const lot of lots ?? []) {
    const key = String(lot.delivery_place_code ?? (lot as any).delivery_place_id ?? lot.id);

    const existing =
      map.get(key) ??
      ({
        key,
        warehouseId: (lot as any).delivery_place_id ?? undefined, // いまは delivery_place を倉庫代替
        warehouseCode: lot.delivery_place_code ?? null,
        warehouseName: lot.delivery_place_name ?? lot.warehouse_name ?? null,
        totalStock: 0,
      } as WarehouseSummary);

    // free_qty が優先。なければ current_quantity
    existing.totalStock += toQty(lot.free_qty ?? lot.current_quantity);
    map.set(key, existing);
  }

  return Array.from(map.values());
}

export function LotAllocationPane({
  selectedLineId,
  selectedLine,
  lotsQuery,
  candidateLots,
  warehouseSummaries,
  warehouseAllocations,
  allocationTotalAll,
  canSave,
  onWarehouseAllocationChange,
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

  // Hooks は常に呼び出す
  const memoWarehouseSummaries = useMemo(
    () => computeWarehouseSummaries(candidateLots ?? []),
    [candidateLots],
  );

  // 渡されていなければ Pane 内で計算したものを使用
  const computedWarehouseSummaries = warehouseSummaries ?? memoWarehouseSummaries;

  return (
    <div className="w-[420px] overflow-y-auto border-l bg-white">
      <div className="space-y-6 p-4">
        <div>
          <h3 className="text-lg font-semibold">候補ロット</h3>
          <p className="mt-1 text-xs text-gray-500">
            製品: {selectedLine.product_code || selectedLine.product_name || "—"}
          </p>
        </div>

        {lotsQuery.isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            候補ロットを読み込み中...
          </div>
        ) : lotsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-center text-sm font-semibold text-red-800">
              候補ロットの取得に失敗しました
            </p>
            <p className="mt-1 text-center text-xs text-red-600">
              {lotsQuery.error instanceof Error
                ? lotsQuery.error.message
                : "サーバーエラーが発生しました"}
            </p>
          </div>
        ) : (candidateLots?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-gray-600">候補ロットがありません</p>
            <p className="mt-1 text-xs text-gray-400">この製品の在庫が存在しません</p>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {candidateLots.map((lot) => (
              <div
                key={lot.lot_id || lot.id}
                className="group rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{lot.lot_number}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      納品先:{" "}
                      {formatCodeAndName(lot.delivery_place_code, lot.delivery_place_name) || "—"}
                    </div>
                    {lot.expiry_date && (
                      <div className="mt-1 text-xs text-gray-500">
                        期限: {new Date(lot.expiry_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">利用可能</div>
                    <div className="mt-1 text-lg font-bold text-blue-600">
                      {toQty(lot.free_qty ?? lot.current_quantity).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      総在庫: {toQty(lot.current_quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 倉庫別配分 */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">倉庫別配分</h3>

          {computedWarehouseSummaries.length === 0 ? (
            <div className="py-4 text-sm text-gray-500">配分可能な倉庫がありません</div>
          ) : (
            <div className="space-y-3">
              {computedWarehouseSummaries.map((w) => {
                const currentValue = warehouseAllocations[w.key] ?? 0;
                const warehouseName = formatCodeAndName(w.warehouseCode, w.warehouseName);

                return (
                  <div
                    key={w.key}
                    className="rounded-lg border p-3 transition hover:border-gray-300"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">{warehouseName}</div>
                      <div className="text-xs text-gray-500">
                        在庫: {w.totalStock.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={w.totalStock}
                        value={currentValue}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            Math.min(w.totalStock, Number(e.target.value) || 0),
                          );
                          onWarehouseAllocationChange(w.key, value);
                        }}
                        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        className="rounded bg-gray-100 px-3 py-2 text-xs font-medium transition hover:bg-gray-200"
                        onClick={() => {
                          const remaining = selectedLine.quantity - allocationTotalAll;
                          const allocatable = Math.min(remaining + currentValue, w.totalStock);
                          onWarehouseAllocationChange(w.key, allocatable);
                        }}
                      >
                        最大
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-xs text-gray-600">
            配分合計: <span className="font-semibold">{allocationTotalAll.toLocaleString()}</span>
          </div>

          <button
            className="mt-4 w-full rounded bg-black py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
