import { Crown } from "lucide-react";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { useFilters } from "@/hooks/ui";
import { SimpleFilterContainer } from "@/shared/components/data/FilterContainer";

interface OrdersFiltersProps {
  filters: ReturnType<typeof useFilters>;
}

/**
 * 受注管理画面のフィルターUI（FilterContainer使用版）
 */
// eslint-disable-next-line max-lines-per-function
export function OrdersFilters({ filters }: OrdersFiltersProps) {
  return (
    <SimpleFilterContainer
      searchValue={(filters.values.search as string) || ""}
      onSearchChange={(value) => filters.set("search", value)}
      searchPlaceholder="受注番号、得意先、製品で検索..."
      onReset={filters.reset}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="space-y-2">
          <label htmlFor="customer-code-filter" className="text-sm font-medium text-slate-700">
            得意先コード
          </label>
          <Input
            id="customer-code-filter"
            value={(filters.values.customer_code as string) || ""}
            onChange={(e) => filters.set("customer_code", e.target.value)}
            placeholder="例: C001"
          />
        </div>

        <div className="col-span-2 space-y-2">
          <span id="order-type-filter-label" className="text-sm font-medium text-slate-700">
            需要種別
          </span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="order-type-filter-label"
          >
            {[
              { value: "all", label: "すべて" },
              { value: "FORECAST_LINKED", label: "FC連携" },
              { value: "KANBAN", label: "かんばん" },
              { value: "SPOT", label: "スポット" },
              { value: "ORDER", label: "通常受注" },
            ].map((option) => {
              const currentValue = (filters.values.order_type as string) || "all";
              const isActive = currentValue === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => filters.set("order_type", option.value)}
                  className={isActive ? "" : "text-slate-600"}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
            ステータス
          </label>
          <Select
            value={(filters.values.status as string) || "all"}
            onValueChange={(value) => filters.set("status", value)}
          >
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="draft">未処理</SelectItem>
              <SelectItem value="allocated">引当済</SelectItem>
              <SelectItem value="shipped">出荷済</SelectItem>
              <SelectItem value="closed">完了</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-end gap-2 pb-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="unallocatedOnly"
              checked={!!filters.values.unallocatedOnly}
              onChange={(e) => filters.set("unallocatedOnly", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="unallocatedOnly" className="text-sm font-medium text-slate-700">
              未引当のみ表示
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="primarySuppliersOnly"
              checked={!!filters.values.primarySuppliersOnly}
              onChange={(e) => filters.set("primarySuppliersOnly", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
            />
            <label
              htmlFor="primarySuppliersOnly"
              className="flex items-center gap-1 text-sm font-medium text-slate-700"
            >
              <Crown className="h-3.5 w-3.5 text-amber-600" />
              主担当の仕入先のみ
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInactiveCustomers"
              checked={!!filters.values.showInactiveCustomers}
              onChange={(e) => filters.set("showInactiveCustomers", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-2 focus:ring-slate-500"
            />
            <label htmlFor="showInactiveCustomers" className="text-sm font-medium text-slate-700">
              無効な得意先を表示
            </label>
          </div>
        </div>
      </div>
    </SimpleFilterContainer>
  );
}
