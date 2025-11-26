import { Filter, Layers, X } from "lucide-react";

import { Button } from "../../../../../components/ui";
import { cn } from "../../../../../shared/libs/utils";
import * as styles from "../LineBasedAllocationList.styles";

import type { FilterStatus, ViewMode } from "./types";

export function FilterBar({
  filterStatus,
  onFilterChange,
  viewMode,
  onViewModeToggle,
}: {
  filterStatus: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  viewMode: ViewMode;
  onViewModeToggle: () => void;
}) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterLabel}>
        <Filter className="h-4 w-4" />
        <span>フィルタ:</span>
      </div>
      {/* フィルタボタン群 */}
      {[
        { id: "all", label: "すべて", color: "gray-800" },
        { id: "complete", label: "引当完了", color: "blue-600" },
        { id: "shortage", label: "在庫不足", color: "red-600" },
        { id: "over", label: "在庫過剰", color: "orange-500" },
        { id: "unallocated", label: "未引当", color: "gray-500" },
      ].map((f) => (
        <Button
          key={f.id}
          variant={filterStatus === f.id ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(f.id as FilterStatus)}
          className={cn(
            "h-7 rounded-full text-xs",
            filterStatus === f.id
              ? f.id === "all"
                ? "bg-gray-800"
                : `bg-${f.color.split("-")[0]}-${f.color.split("-")[1]}`
              : `border-${f.color.split("-")[0]}-200 text-${f.color.split("-")[0]}-600 hover:bg-${f.color.split("-")[0]}-50`,
          )}
        >
          {f.label}
        </Button>
      ))}

      {/* フィルタクリアボタン */}
      {filterStatus !== "all" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange("all")}
          className="h-7 px-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="mr-1 h-3 w-3" />
          クリア
        </Button>
      )}

      {/* グルーピングトグル */}
      <div className={styles.groupingToggleContainer}>
        <span className={styles.groupingToggleLabel}>グルーピング:</span>
        <Button
          type="button"
          variant={viewMode === "order" ? "default" : "outline"}
          size="sm"
          onClick={onViewModeToggle}
          className="h-7 rounded-full text-xs"
        >
          <Layers className="mr-1.5 h-3 w-3" />
          {viewMode === "order" ? "ON" : "OFF"}
        </Button>
      </div>
    </div>
  );
}
