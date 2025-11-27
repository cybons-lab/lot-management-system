import { ChevronDown, ChevronRight, Search } from "lucide-react";

import type { LotFilters } from "../state";

import { LotAdvancedFilters } from "./LotAdvancedFilters";

import { Button, Input } from "@/components/ui";

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
        <LotAdvancedFilters
          filters={filters}
          onFilterChange={onFilterChange}
          onReset={onReset}
        />
      )}
    </div>
  );
}
