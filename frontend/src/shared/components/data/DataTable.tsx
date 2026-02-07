import * as React from "react";

import { DataTableHeader } from "./DataTable/DataTableHeader";
import { DataTableRow } from "./DataTable/DataTableRow";
import { DataTableLoading, DataTableEmpty } from "./DataTable/DataTableStates";
import { DataTableToolbar } from "./DataTable/DataTableToolbar";
import { type Column, type SortConfig } from "./DataTable/types";
import { useDataTable } from "./DataTable/useDataTable";

import { cn } from "@/shared/libs/utils";

export type { Column, SortConfig };

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sort?: SortConfig | undefined;
  onSortChange?: ((sort: SortConfig) => void) | undefined;
  selectable?: boolean | undefined;
  selectedIds?: (string | number)[] | undefined;
  onSelectionChange?: ((selectedIds: (string | number)[]) => void) | undefined;
  getRowId?: ((row: T) => string | number) | undefined;
  onRowClick?: ((row: T) => void) | undefined;
  rowActions?: ((row: T) => React.ReactNode) | undefined;
  renderHoverActions?: ((row: T) => React.ReactNode) | undefined;
  emptyMessage?: string | undefined;
  isLoading?: boolean | undefined;
  className?: string | undefined;
  getRowClassName?: ((row: T) => string) | undefined;
  expandable?: boolean | undefined;
  expandMode?: "single" | "multi" | undefined;
  expandedRowIds?: (string | number)[] | undefined;
  onExpandedRowsChange?: ((ids: (string | number)[]) => void) | undefined;
  renderExpandedRow?: ((row: T) => React.ReactNode) | undefined;
  headerSlot?: React.ReactNode | undefined;
  enableVirtualization?: boolean | undefined;
  scrollAreaHeight?: string | number | undefined;
  isRowSelectable?: ((row: T) => boolean) | undefined;
  dense?: boolean | undefined;
  striped?: boolean | undefined;
}

/**
 * プロジェクト共通の高度なデータテーブルコンポーネント
 */
export function DataTable<T>({
  isLoading,
  data,
  columns,
  emptyMessage = "データがありません",
  className,
  dense,
  enableVirtualization,
  scrollAreaHeight,
  ...props
}: DataTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const { table, rowVirtualizer } = useDataTable({
    ...props,
    data,
    columns,
    ...(dense != null ? { dense } : {}),
    ...(enableVirtualization != null ? { enableVirtualization } : {}),
    parentRef,
  });
  const rows = table.getRowModel().rows;

  if (isLoading)
    return (
      <DataTableLoading
        columnCount={columns.length + (props.selectable ? 1 : 0)}
        {...(dense != null ? { dense } : {})}
        {...(className != null ? { className } : {})}
      />
    );
  if (data.length === 0) return <DataTableEmpty message={emptyMessage} />;

  const paddingTop =
    enableVirtualization && rowVirtualizer.getVirtualItems().length > 0
      ? rowVirtualizer.getVirtualItems()[0]!.start
      : 0;
  const paddingBottom =
    enableVirtualization && rowVirtualizer.getVirtualItems().length > 0
      ? rowVirtualizer.getTotalSize() -
        rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]!.end
      : 0;

  return (
    <div className={cn("relative flex flex-col", className)}>
      <DataTableToolbar table={table} headerSlot={props.headerSlot} />
      <div
        ref={parentRef}
        className={cn(
          "relative rounded-xl border border-[hsl(var(--border))] bg-white shadow-[var(--shadow-soft)]",
          enableVirtualization ? "overflow-y-auto" : "overflow-x-auto",
        )}
        style={
          enableVirtualization
            ? { height: scrollAreaHeight ?? "600px", overflowAnchor: "none" }
            : {}
        }
      >
        <table className="responsive-table w-full" style={{ tableLayout: "fixed" }}>
          <DataTableHeader
            table={table}
            {...(dense != null ? { dense } : {})}
            {...(enableVirtualization != null ? { enableVirtualization } : {})}
          />
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td
                  style={{ height: `${paddingTop}px` }}
                  colSpan={table.getVisibleLeafColumns().length}
                />
              </tr>
            )}
            {(enableVirtualization ? rowVirtualizer.getVirtualItems() : rows).map((v: any) => {
              const row = enableVirtualization ? rows[v.index]! : v;
              return (
                <DataTableRow
                  key={row.id}
                  row={row}
                  {...(dense != null ? { dense } : {})}
                  {...(props.striped != null ? { striped: props.striped } : {})}
                  {...(props.onRowClick != null ? { onRowClick: props.onRowClick } : {})}
                  {...(props.renderHoverActions !== undefined && {
                    renderHoverActions: props.renderHoverActions,
                  })}
                  {...(props.renderExpandedRow !== undefined && {
                    renderExpandedRow: props.renderExpandedRow,
                  })}
                  {...(props.getRowClassName !== undefined && {
                    getRowClassName: props.getRowClassName,
                  })}
                  {...(enableVirtualization
                    ? { measureElement: rowVirtualizer.measureElement }
                    : {})}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td
                  style={{ height: `${paddingBottom}px` }}
                  colSpan={table.getVisibleLeafColumns().length}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
