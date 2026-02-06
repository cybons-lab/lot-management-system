import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { SupplierFilterCheckbox } from "@/features/assignments/components";
import type { useFilters } from "@/hooks/ui";
import { SimpleFilterContainer } from "@/shared/components/data/FilterContainer";

interface OrdersFiltersProps {
  filters: ReturnType<typeof useFilters>;
  filterEnabled: boolean;
  onToggleFilter: (enabled: boolean) => void;
}

const ORDER_TYPE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "FORECAST_LINKED", label: "FC連携" },
  { value: "KANBAN", label: "かんばん" },
  { value: "SPOT", label: "スポット" },
  { value: "ORDER", label: "通常受注" },
] as const;

function FilterCheckbox({
  id,
  label,
  checked,
  onChange,
  className,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className: string;
}) {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={className}
      />
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
    </div>
  );
}

function OrderTypeFilterButtons({ filters }: { filters: ReturnType<typeof useFilters> }) {
  const currentValue = (filters.values.order_type as string) || "all";

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="order-type-filter-label">
      {ORDER_TYPE_OPTIONS.map((option) => {
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
  );
}

/**
 * 受注管理画面のフィルターUI（FilterContainer使用版）
 */
export function OrdersFilters({ filters, filterEnabled, onToggleFilter }: OrdersFiltersProps) {
  return (
    <SimpleFilterContainer
      searchValue={(filters.values.search as string) || ""}
      onSearchChange={(value) => filters.set("search", value)}
      searchPlaceholder="受注番号、納入先、得意先、商品、SAP受注Noで検索..."
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
          <OrderTypeFilterButtons filters={filters} />
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
          <FilterCheckbox
            id="unallocatedOnly"
            label="未引当のみ表示"
            checked={!!filters.values.unallocatedOnly}
            onChange={(checked) => filters.set("unallocatedOnly", checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <SupplierFilterCheckbox enabled={filterEnabled} onToggle={onToggleFilter} />
          <FilterCheckbox
            id="showInactiveCustomers"
            label="無効な得意先を表示"
            checked={!!filters.values.showInactiveCustomers}
            onChange={(checked) => filters.set("showInactiveCustomers", checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>
    </SimpleFilterContainer>
  );
}
