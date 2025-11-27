import type { LotFilters } from "../state";

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

interface LotAdvancedFiltersProps {
    filters: LotFilters;
    onFilterChange: (key: keyof LotFilters, value: unknown) => void;
    onReset: () => void;
}

export function LotAdvancedFilters({ filters, onFilterChange, onReset }: LotAdvancedFiltersProps) {
    return (
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
    );
}
