import { Database, Table } from "lucide-react";

import type { DbObject, DbObjectType } from "../api";

import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/libs/utils";

const TYPE_LABELS: Record<DbObjectType, string> = {
  table: "Table",
  view: "View",
  materialized_view: "Mat View",
};

const TYPE_BADGE_STYLE: Record<DbObjectType, string> = {
  table: "bg-blue-100 text-blue-700",
  view: "bg-purple-100 text-purple-700",
  materialized_view: "bg-amber-100 text-amber-700",
};

interface DbObjectListProps {
  objects: DbObject[];
  isLoading: boolean;
  selected: DbObject | null;
  onSelect: (obj: DbObject) => void;
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: DbObjectType | "all";
  onTypeFilterChange: (value: DbObjectType | "all") => void;
  filteredObjects: DbObject[];
}

// eslint-disable-next-line max-lines-per-function
export function DbObjectList({
  isLoading,
  selected,
  onSelect,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  filteredObjects,
}: DbObjectListProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Database className="h-4 w-4" />
          DB Objects
        </div>
        <div className="mt-3 space-y-2">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="検索 (schema / name)"
          />
          <Select
            value={typeFilter}
            onValueChange={(value) => onTypeFilterChange(value as DbObjectType | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="種類" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="materialized_view">Materialized View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
        <div className="divide-y divide-gray-100">
          {isLoading && <div className="p-4 text-sm text-gray-500">読み込み中...</div>}
          {!isLoading && filteredObjects.length === 0 && (
            <div className="p-4 text-sm text-gray-500">該当するオブジェクトがありません</div>
          )}
          {filteredObjects.map((obj) => {
            const isActive =
              selected?.schema_name === obj.schema_name &&
              selected?.object_name === obj.object_name;
            return (
              <button
                key={`${obj.schema_name}.${obj.object_name}`}
                type="button"
                onClick={() => onSelect(obj)}
                className={cn(
                  "flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors",
                  isActive ? "bg-blue-50" : "hover:bg-gray-50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <Table className="h-4 w-4 text-gray-400" />
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {obj.schema_name}.{obj.object_name}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 font-normal", TYPE_BADGE_STYLE[obj.object_type])}
                  >
                    {TYPE_LABELS[obj.object_type]}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">{obj.comment || "コメントなし"}</div>
                <div className="text-xs text-gray-400">
                  行数推定: {obj.row_estimate?.toLocaleString() ?? "-"}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
