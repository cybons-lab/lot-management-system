// frontend/src/features/orders/components/WarehouseSelector.tsx

import React from "react";

type Props = {
  /** 選択可能な倉庫リスト（受注に指定された倉庫） */
  warehouses: string[];
  /** 選択中の倉庫 */
  selectedWarehouse: string;
  /** 倉庫選択時のコールバック */
  onSelectWarehouse: (warehouse: string) => void;
};

export function WarehouseSelector({ warehouses, selectedWarehouse, onSelectWarehouse }: Props) {
  if (warehouses.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="text-sm text-amber-700">⚠️ 倉庫が指定されていません</div>
      </div>
    );
  }

  // 倉庫が1つの場合は自動選択
  React.useEffect(() => {
    if (warehouses.length === 1 && !selectedWarehouse) {
      onSelectWarehouse(warehouses[0]);
    }
  }, [warehouses, selectedWarehouse, onSelectWarehouse]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        出荷倉庫 <span className="text-red-500">*</span>
      </label>

      {/* 倉庫が1つの場合は固定表示 */}
      {warehouses.length === 1 ? (
        <div className="px-3 py-2 rounded-lg bg-sky-50 border border-sky-200">
          <div className="text-sm font-medium text-sky-700">{warehouses[0]}</div>
          <div className="text-xs text-gray-500 mt-0.5">かんばん指定倉庫</div>
        </div>
      ) : (
        // 倉庫が複数の場合は選択UI
        <div className="space-y-2">
          {warehouses.map((wh) => (
            <button
              key={wh}
              className={`w-full px-3 py-2 rounded-lg border text-left transition-colors ${
                selectedWarehouse === wh
                  ? "bg-sky-600 text-white border-sky-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => onSelectWarehouse(wh)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{wh}</span>
                {selectedWarehouse === wh && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
