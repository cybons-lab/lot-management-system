/**
 * LotAllocationPane - Right pane for lot candidates and warehouse allocations
 */

import type { UseQueryResult } from "@tanstack/react-query";

import type { OrderLine, WarehouseSummary } from "../types";

import type { Lot as CandidateLot } from "@/hooks/useLotsQuery";
import { formatCodeAndName } from "@/shared/libs/utils";

interface LotAllocationPaneProps {
  selectedLineId: number | null;
  selectedLine: OrderLine | undefined;
  lotsQuery: UseQueryResult<CandidateLot[], Error>;
  candidateLots: CandidateLot[];
  warehouseSummaries: WarehouseSummary[];
  warehouseAllocations: Record<string, number>;
  allocationTotalAll: number;
  canSave: boolean;
  onWarehouseAllocationChange: (key: string, value: number) => void;
  onSaveAllocations: () => void;
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

  return (
    <div className="w-[420px] overflow-y-auto border-l bg-white">
      <div className="space-y-6 p-4">
        <div>
          <h3 className="text-lg font-semibold">候補ロット</h3>
          <p className="mt-1 text-xs text-gray-500">製品コード: {selectedLine.product_code}</p>
        </div>

        <div className="rounded-lg border p-3">
          {lotsQuery.isLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">候補ロットを読み込み中...</div>
          ) : lotsQuery.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4">
              <p className="text-center text-sm font-semibold text-red-800">
                候補ロットの取得に失敗しました
              </p>
              <p className="mt-1 text-center text-xs text-red-600">
                {lotsQuery.error instanceof Error
                  ? lotsQuery.error.message
                  : "サーバーエラーが発生しました"}
              </p>
            </div>
          ) : candidateLots.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-gray-600">候補ロットがありません</p>
              <p className="mt-1 text-xs text-gray-400">この製品の在庫が存在しません</p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">ロット番号</th>
                    <th className="px-2 py-1 text-left font-medium">倉庫</th>
                    <th className="px-2 py-1 text-right font-medium">在庫数</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateLots.map((lot) => (
                    <tr key={lot.id} className="border-t">
                      <td className="px-2 py-1">{lot.lot_number}</td>
                      <td className="px-2 py-1 text-gray-600">
                        {lot.warehouse_name || lot.warehouse_code || "―"}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {(lot.current_stock?.current_quantity ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 倉庫別配分入力 */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">倉庫別配分</h3>
          {warehouseSummaries.length === 0 ? (
            <div className="py-4 text-sm text-gray-500">配分可能な倉庫がありません</div>
          ) : (
            <div className="space-y-3">
              {warehouseSummaries.map((warehouse) => {
                const currentValue = warehouseAllocations[warehouse.key] ?? 0;
                const warehouseName = formatCodeAndName(
                  warehouse.warehouseCode,
                  warehouse.warehouseName,
                );

                return (
                  <div
                    key={warehouse.key}
                    className="rounded-lg border p-3 transition hover:border-gray-300"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">{warehouseName}</div>
                      <div className="text-xs text-gray-500">
                        在庫: {warehouse.totalStock.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={warehouse.totalStock}
                        value={currentValue}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            Math.min(warehouse.totalStock, Number(e.target.value) || 0),
                          );
                          onWarehouseAllocationChange(warehouse.key, value);
                        }}
                        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        className="rounded bg-gray-100 px-3 py-2 text-xs font-medium transition hover:bg-gray-200"
                        onClick={() => {
                          const remaining = selectedLine.quantity - allocationTotalAll;
                          const allocatable = Math.min(
                            remaining + currentValue,
                            warehouse.totalStock,
                          );
                          onWarehouseAllocationChange(warehouse.key, allocatable);
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
