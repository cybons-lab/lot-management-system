import { Calendar, Filter } from "lucide-react";

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

interface Maker {
  id: number;
  maker_code: string;
  maker_name: string;
}

interface ForecastFilterBarProps {
  targetMonth: string;
  setTargetMonth: (val: string) => void;
  makerCode: string;
  setMakerCode: (val: string) => void;
  makers: Maker[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export function ForecastFilterBar({
  targetMonth,
  setTargetMonth,
  makerCode,
  setMakerCode,
  makers,
  searchQuery,
  setSearchQuery,
}: ForecastFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="space-y-1.5">
        <label
          htmlFor="target-month-filter"
          className="flex items-center gap-1 text-xs font-medium text-slate-500"
        >
          <Calendar className="h-3 w-3" /> 対象月
        </label>
        <Input
          id="target-month-filter"
          type="month"
          value={targetMonth}
          onChange={(e) => setTargetMonth(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="maker-filter"
          className="flex items-center gap-1 text-xs font-medium text-slate-500"
        >
          <Filter className="h-3 w-3" /> メーカー
        </label>
        <Select value={makerCode} onValueChange={setMakerCode}>
          <SelectTrigger id="maker-filter" className="w-48">
            <SelectValue placeholder="メーカーを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {makers.map((m) => (
              <SelectItem key={m.id} value={m.maker_code}>
                {m.maker_name} ({m.maker_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="max-w-sm flex-1 space-y-1.5">
        <label htmlFor="material-search" className="text-xs font-medium text-slate-500">
          材質検索
        </label>
        <Input
          id="material-search"
          placeholder="材質コード・名称で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
