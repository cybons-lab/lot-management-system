// frontend/src/features/orders/components/OrderFilters.tsx
import { Menu } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/libs/utils";
import type { OrdersListParams } from "@/shared/types/legacy";

interface Props {
  value: OrdersListParams;
  onChange: (params: OrdersListParams) => void;
  onSearch: () => void;
  onReset: () => void;
}

function MobileFilterToggle({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 lg:hidden"
      aria-label="フィルタを表示/非表示"
    >
      <Menu className="h-5 w-5" />
      <span>フィルタ</span>
      <span className="text-xs text-gray-500">{isExpanded ? "（開く）" : "（閉じる）"}</span>
    </button>
  );
}

function FilterGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterActionButtons({ onSearch, onReset }: { onSearch: () => void; onReset: () => void }) {
  return (
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
  );
}

export function OrderFilters({ value, onChange, onSearch, onReset }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <MobileFilterToggle isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />

      <div className={cn("space-y-3", "lg:block", !isExpanded && "hidden lg:block")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FilterGroup label="顧客コード" htmlFor="customer-code-input">
            <input
              id="customer-code-input"
              type="text"
              className="w-full rounded border px-3 py-1.5 text-sm"
              placeholder="部分一致で検索"
              value={value.customer_code ?? ""}
              onChange={(event) => onChange({ ...value, customer_code: event.target.value })}
            />
          </FilterGroup>

          <FilterGroup label="ステータス" htmlFor="status-select">
            <select
              id="status-select"
              className="w-full rounded border px-3 py-1.5 text-sm"
              value={value.status ?? ""}
              onChange={(event) => onChange({ ...value, status: event.target.value })}
            >
              <option value="">すべて</option>
              <option value="open">open</option>
              <option value="partial">partial</option>
              <option value="allocated">allocated</option>
              <option value="shipped">shipped</option>
            </select>
          </FilterGroup>

          <FilterGroup label="納期" htmlFor="due-date-select">
            <select
              id="due-date-select"
              className="w-full rounded border px-3 py-1.5 text-sm"
              onChange={() =>
                onChange({
                  ...value,
                })
              }
            >
              <option value="all">すべて</option>
              <option value="has_due">納期あり</option>
              <option value="no_due">納期なし</option>
            </select>
          </FilterGroup>
        </div>

        <FilterActionButtons onSearch={onSearch} onReset={onReset} />
      </div>
    </div>
  );
}
