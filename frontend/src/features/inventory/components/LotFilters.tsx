/**
 * LotFilters.tsx
 *
 * ロット一覧のフィルターパネルコンポーネント
 */

import type { LotFilterValues } from "../hooks/useLotFilters";

import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { FilterField } from "@/shared/components/data/FilterField";
import { FilterPanel } from "@/shared/components/data/FilterPanel";
import { SearchBar } from "@/shared/components/data/SearchBar";

interface LotFiltersProps {
  /** フィルター値 */
  filters: LotFilterValues;
  /** フィルター変更ハンドラ */
  onFilterChange: <K extends keyof LotFilterValues>(key: K, value: LotFilterValues[K]) => void;
  /** リセットハンドラ */
  onReset: () => void;
}

/**
 * ロット一覧のフィルターパネル
 */
export function LotFilters({ filters, onFilterChange, onReset }: LotFiltersProps) {
  return (
    <FilterPanel title="検索・フィルター" onReset={onReset}>
      <SearchBar
        value={filters.search}
        onChange={(value: string) => onFilterChange("search", value)}
        placeholder="ロット番号、製品コード、製品名で検索..."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FilterField label="製品コード">
          <Input
            value={filters.product_code}
            onChange={(e) => onFilterChange("product_code", e.target.value)}
            placeholder="例: P001"
          />
        </FilterField>

        <FilterField label="納品先コード">
          <Input
            value={filters.delivery_place_code}
            onChange={(e) => onFilterChange("delivery_place_code", e.target.value)}
            placeholder="例: DP-001"
          />
        </FilterField>

        <FilterField label="ステータス">
          <Select value={filters.status} onValueChange={(value) => onFilterChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="active">有効</SelectItem>
              <SelectItem value="allocated">引当済</SelectItem>
              <SelectItem value="shipped">出荷済</SelectItem>
              <SelectItem value="inactive">無効</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <div className="mt-1 flex items-center space-x-2 rounded-md bg-slate-50 px-3 py-2">
        <input
          type="checkbox"
          id="hasStock"
          checked={filters.hasStock}
          onChange={(e) => onFilterChange("hasStock", e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        <label htmlFor="hasStock" className="text-sm font-medium text-slate-700">
          在庫ありのみ表示
        </label>
      </div>
    </FilterPanel>
  );
}
