import { Database, Table } from "lucide-react";

import type { DbObject, DbObjectType } from "../api";

import { Input } from "@/components/ui/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
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
  columnSearch: string;
  onColumnSearchChange: (value: string) => void;
  typeFilter: DbObjectType | "all";
  onTypeFilterChange: (value: DbObjectType | "all") => void;
  filteredObjects: DbObject[];
}

function DbObjectFilters({
  search,
  onSearchChange,
  columnSearch,
  onColumnSearchChange,
  typeFilter,
  onTypeFilterChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  columnSearch: string;
  onColumnSearchChange: (value: string) => void;
  typeFilter: DbObjectType | "all";
  onTypeFilterChange: (value: DbObjectType | "all") => void;
}) {
  const handleTypeFilterChange = (value: string) => {
    onTypeFilterChange(value as DbObjectType | "all");
  };

  return (
    <div className="mt-3 space-y-2">
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="オブジェクト名で検索 (schema / name)"
      />
      <Input
        value={columnSearch}
        onChange={(event) => onColumnSearchChange(event.target.value)}
        placeholder="フィールド名で検索 (column_name)"
      />
      <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
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
  );
}

function DbObjectListItem({
  obj,
  isActive,
  onSelect,
}: {
  obj: DbObject;
  isActive: boolean;
  onSelect: (obj: DbObject) => void;
}) {
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
        <div className="flex flex-row items-center gap-1.5 overflow-hidden">
          <Table className="h-4 w-4 text-gray-400" />
          <span className="truncate text-sm font-semibold text-gray-900">
            {obj.schema_name}.{obj.object_name}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            TYPE_BADGE_STYLE[obj.object_type],
          )}
        >
          {TYPE_LABELS[obj.object_type]}
        </span>
      </div>
      <div className="text-xs text-gray-500">{obj.comment || "コメントなし"}</div>
      <div className="text-xs text-gray-400">
        行数推定: {obj.row_estimate?.toLocaleString() ?? "-"}
      </div>
    </button>
  );
}

function DbObjectListBody({
  isLoading,
  filteredObjects,
  selected,
  onSelect,
}: {
  isLoading: boolean;
  filteredObjects: DbObject[];
  selected: DbObject | null;
  onSelect: (obj: DbObject) => void;
}) {
  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
      <div className="divide-y divide-gray-100">
        {isLoading && <div className="p-4 text-sm text-gray-500">読み込み中...</div>}
        {!isLoading && filteredObjects.length === 0 && (
          <div className="p-4 text-sm text-gray-500">該当するオブジェクトがありません</div>
        )}
        {filteredObjects.map((obj) => (
          <DbObjectListItem
            key={`${obj.schema_name}.${obj.object_name}`}
            obj={obj}
            isActive={
              selected?.schema_name === obj.schema_name && selected?.object_name === obj.object_name
            }
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export function DbObjectList({
  isLoading,
  selected,
  onSelect,
  search,
  onSearchChange,
  columnSearch,
  onColumnSearchChange,
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
        <DbObjectFilters
          search={search}
          onSearchChange={onSearchChange}
          columnSearch={columnSearch}
          onColumnSearchChange={onColumnSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={onTypeFilterChange}
        />
      </div>
      <DbObjectListBody
        isLoading={isLoading}
        filteredObjects={filteredObjects}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
}
