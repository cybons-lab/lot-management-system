import * as React from "react";
import { cn } from "@/shared/libs/utils";
import { useDataTable, type Column, type SortConfig } from "./DataTable/useDataTable";
import { DataTableHeader } from "./DataTable/DataTableHeader";
import { DataTableRow } from "./DataTable/DataTableRow";
import { DataTableToolbar } from "./DataTable/DataTableToolbar";
import { DataTableLoading, DataTableEmpty } from "./DataTable/DataTableStates";

export type { Column, SortConfig };

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sort?: SortConfig;
  onSortChange?: (sort: SortConfig) => void;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  renderHoverActions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  getRowClassName?: (row: T) => string;
  expandable?: boolean;
  expandMode?: "single" | "multi";
  expandedRowIds?: (string | number)[];
  onExpandedRowsChange?: (ids: (string | number)[]) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  headerSlot?: React.ReactNode;
  enableVirtualization?: boolean;
  scrollAreaHeight?: string | number;
  isRowSelectable?: (row: T) => boolean;
  dense?: boolean;
  striped?: boolean;
}

/**
 * プロジェクト共通の高度なデータテーブルコンポーネント
 */
export function DataTable<T>({
  isLoading, data, columns, emptyMessage = "データがありません", className, dense, enableVirtualization, scrollAreaHeight, ...props
}: DataTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const { table, rowVirtualizer } = useDataTable({ ...props, data, columns, dense, enableVirtualization, parentRef });
  const rows = table.getRowModel().rows;

  if (isLoading) return <DataTableLoading columnCount={columns.length + (props.selectable ? 1 : 0)} dense={dense} className={className} />;
  if (data.length === 0) return <DataTableEmpty message={emptyMessage} />;

  const paddingTop = enableVirtualization && rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getVirtualItems()[0].start : 0;
  const paddingBottom = enableVirtualization && rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end : 0;

  return (
    <div className={cn("relative flex flex-col", className)}>
      <DataTableToolbar table={table} headerSlot={props.headerSlot} />
      <div ref={parentRef} className={cn("relative rounded-xl border border-[hsl(var(--border))] bg-white shadow-[var(--shadow-soft)]", enableVirtualization ? "overflow-y-auto" : "overflow-x-auto")} style={enableVirtualization ? { height: scrollAreaHeight ?? "600px", overflowAnchor: "none" } : {}}>
        <table className="responsive-table w-full" style={{ tableLayout: "fixed" }}>
          <DataTableHeader table={table} dense={dense} enableVirtualization={enableVirtualization} />
          <tbody>
            {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={table.getVisibleLeafColumns().length} /></tr>}
            {(enableVirtualization ? rowVirtualizer.getVirtualItems() : rows).map((v: any) => {
              const row = enableVirtualization ? rows[v.index] : v;
              return <DataTableRow key={row.id} row={row} dense={dense} striped={props.striped} onRowClick={props.onRowClick} renderHoverActions={props.renderHoverActions} renderExpandedRow={props.renderExpandedRow} getRowClassName={props.getRowClassName} measureElement={enableVirtualization ? rowVirtualizer.measureElement : undefined} />;
            })}
            {paddingBottom > 0 && <tr><td style={{ height: `${paddingBottom}px` }} colSpan={table.getVisibleLeafColumns().length} /></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
