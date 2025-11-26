import { ChevronDown, ChevronRight, Search } from "lucide-react";

import type { LotFilters } from "../state";

import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Button } from "@/components/ui";

interface LotsPageFiltersProps {
  filters: LotFilters;
  onFilterChange: (key: keyof LotFilters, value: unknown) => void;
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isAdvancedOpen: boolean;
  onToggleAdvanced: () => void;
}

export function LotsPageFilters({
  filters,
  onFilterChange,
  onReset,
  searchTerm,
  onSearchChange,
  isAdvancedOpen,
  onToggleAdvanced,
}: LotsPageFiltersProps) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="ロット番号、製品コード、製品名で検索..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={onToggleAdvanced} className="whitespace-nowrap">
          詳細フィルター
          {isAdvancedOpen ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : (
            <ChevronRight className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>

      {isAdvancedOpen && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="product-code-filter" className="text-sm font-medium">
              製品コード
            </label>
            <Input
              id="product-code-filter"
              placeholder="PROD-..."
              value={filters.productCode ?? ""}
              onChange={(e) => onFilterChange("productCode", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="warehouse-code-filter" className="text-sm font-medium">
              倉庫コード
            </label>
            <Input
              id="warehouse-code-filter"
              placeholder="WH-..."
              value={filters.warehouseCode ?? ""}
              onChange={(e) => onFilterChange("warehouseCode", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="status-filter" className="text-sm font-medium">
              ステータス
            </label>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) => onFilterChange("status", value)}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="全て" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="active">有効</SelectItem>
                <SelectItem value="locked">ロック中</SelectItem>
                <SelectItem value="depleted">在庫切れ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2 pb-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="inStockOnly"
                checked={filters.inStockOnly ?? false}
                onChange={(e) => onFilterChange("inStockOnly", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="inStockOnly" className="text-sm font-medium text-slate-700">
                在庫ありのみ表示
              </label>
            </div>
            <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-gray-500">
              リセット
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
