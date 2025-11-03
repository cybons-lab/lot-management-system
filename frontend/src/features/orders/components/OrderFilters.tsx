import React from "react";
import type { OrdersListParams } from "@/types";

type Props = {
  value: OrdersListParams;
  onChange: (next: OrdersListParams) => void;
  onSearch: () => void;
  onReset?: () => void;
};

export default function OrderFilters({
  value,
  onChange,
  onSearch,
  onReset,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-2xl shadow-sm border">
      {/* 顧客コード */}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">顧客コード</label>
        <input
          className="border rounded px-2 py-1"
          value={value.customer_code ?? ""}
          onChange={(e) =>
            onChange({ ...value, customer_code: e.target.value || undefined })
          }
          placeholder="CUST-001"
        />
      </div>

      {/* ステータス */}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">ステータス</label>
        <select
          className="border rounded px-2 py-1"
          value={value.status ?? ""}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value || undefined })
          }>
          <option value="">（すべて）</option>
          <option value="open">open</option>
          <option value="allocated">allocated</option>
          <option value="closed">closed</option>
        </select>
      </div>

      {/* 納期フィルタ */}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">納期</label>
        <select
          className="border rounded px-2 py-1"
          value={value.due_filter ?? "all"}
          onChange={(e) =>
            onChange({
              ...value,
              // 空はありえないので 'all' を既定に固定
              due_filter: e.target.value as "all" | "has_due" | "no_due",
            })
          }>
          <option value="all">すべて</option>
          <option value="has_due">あり</option>
          <option value="no_due">なし（要対応）</option>
        </select>
      </div>

      {/* 操作ボタン */}
      <div className="flex gap-2 ml-auto">
        {onReset && (
          <button className="px-3 py-1 rounded border" onClick={onReset}>
            クリア
          </button>
        )}
        <button
          className="px-3 py-1 rounded bg-black text-white"
          onClick={onSearch}>
          検索
        </button>
      </div>
    </div>
  );
}
