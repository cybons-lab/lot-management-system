import type { InboundPlansFilters } from "../types";

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { SupplierFilterCheckbox } from "@/features/assignments/components";
import { useInboundPlansFilterLogic } from "@/features/inbound-plans/hooks";
import { SimpleFilterContainer } from "@/shared/components/data/FilterContainer";

interface InboundPlansFilterProps {
  filters: InboundPlansFilters;
  onFilterChange: (filters: InboundPlansFilters) => void;
  filterEnabled: boolean;
  onToggleFilter: (enabled: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function InboundPlansFilter({
  filters,
  onFilterChange,
  filterEnabled,
  onToggleFilter,
  searchQuery,
  onSearchChange,
}: InboundPlansFilterProps) {
  const { supplierOptions, handleResetFilters } = useInboundPlansFilterLogic({
    onFilterChange,
    onSearchChange,
  });

  return (
    <SimpleFilterContainer hideSearch onReset={handleResetFilters}>
      <div className="grid gap-4 md:grid-cols-5">
        <div>
          <Label className="mb-2 block text-sm font-medium">仕入先</Label>
          <SearchableSelect
            options={supplierOptions}
            value={filters.supplier_id}
            onChange={(value) => onFilterChange({ ...filters, supplier_id: value })}
            placeholder="仕入先を検索..."
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">ステータス</Label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value as InboundPlansFilters["status"],
              })
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">すべて</option>
            <option value="planned">予定</option>
            <option value="partially_received">一部入荷</option>
            <option value="received">入荷済</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">入荷予定日（開始）</Label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">入荷予定日（終了）</Label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })}
          />
        </div>
        <div className="flex items-end pb-2">
          <SupplierFilterCheckbox enabled={filterEnabled} onToggle={onToggleFilter} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-sm font-medium">キーワード検索</Label>
          <Input
            type="search"
            placeholder="入荷予定番号・SAP発注番号・仕入先で検索..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </SimpleFilterContainer>
  );
}
