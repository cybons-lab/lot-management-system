// frontend/src/features/orders/components/OrderFilters.tsx
import type { OrdersListParams } from "@/shared/types/legacy";

type Props = {
  value: OrdersListParams;
  onChange: (params: OrdersListParams) => void;
  onSearch: () => void;
  onReset: () => void;
};

export function OrderFilters({ value, onChange, onSearch, onReset }: Props) {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* 顧客コード */}
        <div>
          <label htmlFor="customer-code-input" className="mb-1 block text-sm font-medium">
            顧客コード
          </label>
          <input
            id="customer-code-input"
            type="text"
            className="w-full rounded border px-3 py-1.5 text-sm"
            placeholder="部分一致で検索"
            value={value.customer_code ?? ""}
            onChange={(_) => onChange({ ...value, customer_code: _.target.value })}
          />
        </div>

        {/* ステータス */}
        <div>
          <label htmlFor="status-select" className="mb-1 block text-sm font-medium">
            ステータス
          </label>
          <select
            id="status-select"
            className="w-full rounded border px-3 py-1.5 text-sm"
            value={value.status ?? ""}
            onChange={(_) => onChange({ ...value, status: _.target.value })}
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
          <label htmlFor="due-date-select" className="mb-1 block text-sm font-medium">
            納期
          </label>
          <select
            id="due-date-select"
            className="w-full rounded border px-3 py-1.5 text-sm"
            onChange={(_) =>
              onChange({
                ...value,
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
          className="flex items-center gap-2 rounded border px-4 py-1.5 text-sm hover:bg-gray-100"
          onClick={onSearch}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          再取得
        </button>

        <button className="rounded border px-4 py-1.5 text-sm hover:bg-gray-100" onClick={onReset}>
          リセット
        </button>
      </div>
    </div>
  );
}
