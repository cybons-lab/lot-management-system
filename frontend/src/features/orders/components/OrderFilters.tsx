// frontend/src/features/orders/components/OrderFilters.tsx
import type { OrdersListParams } from "@/types/legacy";

type Props = {
  value: OrdersListParams;
  onChange: (params: OrdersListParams) => void;
  onSearch: () => void;
  onReset: () => void;
};

export function OrderFilters({ value, onChange, onSearch, onReset }: Props) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 顧客コード */}
        <div>
          <label className="block text-sm font-medium mb-1">顧客コード</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-1.5 text-sm"
            placeholder="部分一致で検索"
            value={value.customer_code ?? ""}
            onChange={(e) => onChange({ ...value, customer_code: e.target.value })}
          />
        </div>

        {/* ステータス */}
        <div>
          <label className="block text-sm font-medium mb-1">ステータス</label>
          <select
            className="w-full border rounded px-3 py-1.5 text-sm"
            value={value.status ?? ""}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            <option value="">すべて</option>
            <option value="open">open</option>
            <option value="partial">partial</option>
            <option value="allocated">allocated</option>
            <option value="shipped">shipped</option>
          </select>
        </div>

        {/* 納期フィルタ */}
        <div>
          <label className="block text-sm font-medium mb-1">納期</label>
          <select
            className="w-full border rounded px-3 py-1.5 text-sm"
            value={value.due_filter ?? "all"}
            onChange={(e) =>
              onChange({
                ...value,
                due_filter: e.target.value as "all" | "has_due" | "no_due",
              })
            }
          >
            <option value="all">すべて</option>
            <option value="has_due">納期あり</option>
            <option value="no_due">納期なし</option>
          </select>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        <button
          className="px-4 py-1.5 rounded border hover:bg-gray-100 text-sm flex items-center gap-2"
          onClick={onSearch}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          再取得
        </button>

        <button className="px-4 py-1.5 rounded border hover:bg-gray-100 text-sm" onClick={onReset}>
          リセット
        </button>
      </div>
    </div>
  );
}
