import { Search } from "lucide-react";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ViewModeSelector } from "@/features/orders/components/ViewModeSelector";
import type { useFilters } from "@/hooks/ui";

type ViewMode = "delivery" | "flat" | "order";

interface OrdersFiltersProps {
  filters: ReturnType<typeof useFilters>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * 受注管理画面のフィルターUI
 */
export function OrdersFilters({ filters, viewMode, onViewModeChange }: OrdersFiltersProps) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <Input
            value={(filters.values.search as string) || ""}
            onChange={(e) => filters.set("search", e.target.value)}
            placeholder="受注番号、得意先、製品で検索..."
            className="pl-9"
          />
        </div>
      </div>

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

        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium text-slate-700">需要種別</label>
          <div className="flex flex-wrap gap-2">
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

        <div className="flex items-end space-x-2 pb-2">
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
          <ViewModeSelector viewMode={viewMode} onViewModeChange={onViewModeChange} />
          <Button
            variant="ghost"
            size="sm"
            onClick={filters.reset}
            className="text-xs text-slate-500"
          >
            リセット
          </Button>
        </div>
      </div>
    </div>
  );
}
