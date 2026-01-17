import {
  type ColumnDef,
  type ExpandedState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
// @ts-expect-error - type resolution issue with @tanstack/react-virtual in monorepo
import { useVirtualizer } from "@tanstack/react-virtual";
import type { VirtualItem } from "@tanstack/virtual-core";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

import { Button, Checkbox, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Skeleton } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

/** カラム定義の型 */
export interface Column<T> {
  id: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  width?: string | number;
  minWidth?: string | number;
  align?: "left" | "center" | "right";
  className?: string;
  sortable?: boolean;
  enableHiding?: boolean;
}

/** ソート設定の型 */
export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

interface DataTableProps<T> {
  /** データ配列 */
  data: T[];
  /** カラム定義 */
  columns: Column<T>[];
  /** ソート状態 */
  sort?: SortConfig;
  /** ソート変更時のコールバック */
  onSortChange?: (sort: SortConfig) => void;
  /** 選択可能かどうか */
  selectable?: boolean;
  /** 選択された行のID配列 */
  selectedIds?: (string | number)[];
  /** 選択変更時のコールバック */
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  /** 行ID取得関数（デフォルトは row.id） */
  getRowId?: (row: T) => string | number;
  /** 行クリック時のアクション */
  onRowClick?: (row: T) => void;
  /** 行内のアクションボタンレンダリング関数 */
  rowActions?: (row: T) => React.ReactNode;
  /** ホバー時に表示するアクション */
  renderHoverActions?: (row: T) => React.ReactNode;
  /** 空データ時のメッセージ */
  emptyMessage?: string;
  /** ローディング状態 */
  isLoading?: boolean;
  /** テーブルのクラス名 */
  className?: string;
  /** 行のクラス名取得関数 */
  getRowClassName?: (row: T) => string;
  /** 展開可能な行を有効化 */
  expandable?: boolean;
  /** 展開された行のID配列 */
  expandedRowIds?: (string | number)[];
  /** 展開状態変更時のコールバック */
  onExpandedRowsChange?: (ids: (string | number)[]) => void;
  /** 展開された行のレンダリング関数 */
  renderExpandedRow?: (row: T) => React.ReactNode;
  /** ツールバー左側に表示するコンテンツ */
  headerSlot?: React.ReactNode;
  /** 仮想スクロールを有効化 */
  enableVirtualization?: boolean;
  /** 仮想スクロール時の表示エリアの高さ */
  scrollAreaHeight?: string | number;
}

// ============================================
// メインコンポーネント
// ============================================

export function DataTable<T = never>({
  data,
  columns,
  sort,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row: T) => (row as Record<string, unknown>)["id"] as string | number,
  onRowClick,
  rowActions,
  renderHoverActions,
  emptyMessage = "データがありません",
  isLoading = false,
  className,
  getRowClassName,
  expandable = false,
  expandedRowIds = [],
  onExpandedRowsChange,
  renderExpandedRow,
  headerSlot,
  enableVirtualization = false,
  scrollAreaHeight,
}: DataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // TanStack Table用のカラム定義変換
  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = [];

    // 選択列
    if (selectable) {
      defs.push({
        id: "__select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label="すべて選択"
            data-testid="select-all-checkbox"
          />
        ),
        cell: ({ row }) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="行を選択"
              data-testid="select-row-checkbox"
            />
          </div>
        ),
        size: 48, // w-12 equivalent
        enableResizing: false,
        enableHiding: false,
      });
    }

    // 展開列
    if (expandable) {
      defs.push({
        id: "__expander",
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-slate-100"
              aria-label={row.getIsExpanded() ? "折りたたむ" : "展開する"}
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
          ) : null;
        },
        size: 40,
        enableResizing: false,
        enableHiding: false,
      });
    }

    // データ列
    // 幅の解析 (例: "200px" -> 200)
    const parseWidth = (width: string | number | undefined): number | undefined => {
      if (width === undefined) return undefined;
      if (typeof width === "number") return width;
      const match = String(width).match(/^(\d+)/);
      return match ? Number.parseInt(match[1], 10) : 150; // デフォルト150px
    };

    columns.forEach((col) => {
      defs.push({
        id: col.id,
        header: col.header,
        // accessorの互換性
        accessorFn: col.accessor ? (row) => col.accessor!(row) : undefined,
        cell: (info) => {
          if (col.cell) {
            return col.cell(info.row.original);
          }
          return info.getValue() as React.ReactNode;
        },
        size: parseWidth(col.width),
        minSize: col.minWidth ? parseWidth(col.minWidth) : undefined,
        enableSorting: col.sortable,
        enableHiding: col.enableHiding ?? true,
        meta: {
          align: col.align,
          className: col.className,
        },
      });
    });

    // アクション列
    if (rowActions) {
      defs.push({
        id: "__actions",
        header: "アクション",
        cell: ({ row }) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div onClick={(e) => e.stopPropagation()}>{rowActions(row.original)}</div>
        ),
        size: 180, // Enough for 2 buttons side by side
        enableResizing: false,
        enableHiding: false,
        meta: {
          align: "right",
        },
      });
    }

    return defs;
  }, [columns, selectable, expandable, rowActions]);

  // ソート状態の変換
  const sorting = useMemo<SortingState>(() => {
    if (!sort) return [];
    return [{ id: sort.column, desc: sort.direction === "desc" }];
  }, [sort]);

  // 行選択状態の変換
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedIds.forEach((id) => {
      selection[String(id)] = true;
    });
    return selection;
  }, [selectedIds]);

  // 展開状態の変換
  const expanded = useMemo<ExpandedState>(() => {
    const expandedState: Record<string, boolean> = {};
    expandedRowIds.forEach((id) => {
      expandedState[String(id)] = true;
    });
    return expandedState;
  }, [expandedRowIds]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
      expanded,
      columnVisibility,
    },
    columnResizeMode: "onChange",
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => String(getRowId(row)),
    getRowCanExpand: () => expandable && !!renderExpandedRow,
    onSortingChange: (updaterOrValue) => {
      if (typeof updaterOrValue === "function") {
        const next = updaterOrValue(sorting);
        if (next.length > 0 && onSortChange) {
          onSortChange({ column: next[0].id, direction: next[0].desc ? "desc" : "asc" });
        }
      } else if (Array.isArray(updaterOrValue) && updaterOrValue.length > 0 && onSortChange) {
        onSortChange({
          column: updaterOrValue[0].id,
          direction: updaterOrValue[0].desc ? "desc" : "asc",
        });
      }
    },
    onRowSelectionChange: (updaterOrValue) => {
      if (!onSelectionChange) return;
      const nextSelection =
        typeof updaterOrValue === "function" ? updaterOrValue(rowSelection) : updaterOrValue;
      const selectedIdList = Object.keys(nextSelection).filter(
        (id) => nextSelection[id as unknown as keyof typeof nextSelection],
      );
      onSelectionChange(selectedIdList);
    },
    onExpandedChange: (updaterOrValue) => {
      if (!onExpandedRowsChange) return;
      const nextExpanded =
        typeof updaterOrValue === "function" ? updaterOrValue(expanded) : updaterOrValue;
      if (typeof nextExpanded === "boolean") {
        onExpandedRowsChange([]);
      } else {
        const expandedIdList = Object.keys(nextExpanded).filter(
          (id) => (nextExpanded as Record<string, boolean>)[id],
        );
        onExpandedRowsChange(expandedIdList);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualSorting: true,
  });

  // Sort Icon Helper
  const SortIcon = ({ isSorted }: { isSorted: false | "asc" | "desc" }) => {
    if (!isSorted) return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
    return isSorted === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  // Virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
    enabled: enableVirtualization,
  });

  const rows = table.getRowModel().rows;
  const virtualRows = enableVirtualization ? rowVirtualizer.getVirtualItems() : [];

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  // ローディング表示
  if (isLoading) {
    return (
      <div className={cn("relative flex flex-col gap-2", className)}>
        <div className="flex items-center justify-end">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-md">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <thead className="border-b bg-slate-50">
              <tr>
                {tableColumns.map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-20 bg-slate-200" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {tableColumns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 空データ表示
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div>{headerSlot}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-8">
              <Settings2 className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">表示列</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>表示列を選択</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}
                  >
                    {column.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Table Container */}
      <div
        ref={parentRef}
        className={cn(
          "relative rounded-lg border border-slate-200 bg-white shadow-md",
          enableVirtualization ? "overflow-y-auto" : "overflow-x-auto",
        )}
        style={enableVirtualization ? { height: scrollAreaHeight ?? "600px", overflowAnchor: 'none' } : {}}
      >
        <table className="responsive-table w-full" style={{ tableLayout: "fixed" }}>
          <thead className={cn("border-b bg-slate-50", enableVirtualization && "sticky top-0 z-10")}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { align?: string; className?: string }
                    | undefined;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "relative px-4 py-3 text-left text-sm font-semibold text-slate-700 bg-slate-50",
                        meta?.align === "center" && "text-center",
                        meta?.align === "right" && "text-right",
                        header.column.getCanSort() &&
                        "cursor-pointer transition-colors select-none hover:bg-slate-100",
                        meta?.className,
                      )}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1 whitespace-nowrap",
                          meta?.align === "right" && "justify-end",
                          meta?.align === "center" && "justify-center",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <SortIcon isSorted={header.column.getIsSorted()} />
                        )}
                      </div>
                      {header.column.getCanResize() && (
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none",
                            "transition-all duration-200 select-none",
                            "bg-transparent hover:w-2 hover:bg-blue-500",
                            header.column.getIsResizing() && "w-2 bg-blue-600 shadow-lg",
                          )}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {enableVirtualization ? (
            /* Virtualized Body */
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={table.getVisibleLeafColumns().length} />
                </tr>
              )}
              {virtualRows.map((virtualItem: VirtualItem) => {
                const row = rows[virtualItem.index];
                const customClassName = getRowClassName?.(row.original);
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      data-index={virtualItem.index}
                      ref={rowVirtualizer.measureElement}
                      className={cn(
                        "relative transition-all duration-150",
                        "group",
                        row.index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                        (onRowClick || renderHoverActions) && "hover:bg-blue-50/30",
                        onRowClick && "cursor-pointer",
                        row.getIsSelected() && "bg-blue-100/60 hover:bg-blue-100/80",
                        customClassName,
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | { align?: string; className?: string }
                          | undefined;
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "overflow-hidden px-4 py-3 text-sm text-slate-900",
                              meta?.align === "center" && "text-center",
                              meta?.align === "right" && "text-right",
                              meta?.className,
                            )}
                            style={{ maxWidth: 0 }}
                            data-label={
                              typeof cell.column.columnDef.header === "string"
                                ? cell.column.columnDef.header
                                : undefined
                            }
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                      {renderHoverActions && (
                        <td className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-100">
                          <div className="pointer-events-auto flex gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                            {renderHoverActions(row.original)}
                          </div>
                        </td>
                      )}
                    </tr>
                    {row.getIsExpanded() && renderExpandedRow && (
                      <tr className="border-l-4 border-l-blue-500 bg-blue-50/50">
                        <td colSpan={row.getVisibleCells().length} className="p-0">
                          <div className="border-t border-slate-200 px-4 py-3">
                            {renderExpandedRow(row.original)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={table.getVisibleLeafColumns().length} />
                </tr>
              )}
            </tbody>
          ) : (
            /* Normal Body */
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const customClassName = getRowClassName?.(row.original);

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={cn(
                        "relative transition-all duration-150",
                        "group",
                        row.index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                        (onRowClick || renderHoverActions) && "hover:bg-blue-50/30",
                        onRowClick && "cursor-pointer",
                        row.getIsSelected() && "bg-blue-100/60 hover:bg-blue-100/80",
                        customClassName,
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | { align?: string; className?: string }
                          | undefined;
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "overflow-hidden px-4 py-3 text-sm text-slate-900",
                              meta?.align === "center" && "text-center",
                              meta?.align === "right" && "text-right",
                              meta?.className,
                            )}
                            style={{ maxWidth: 0 }}
                            data-label={
                              typeof cell.column.columnDef.header === "string"
                                ? cell.column.columnDef.header
                                : undefined
                            }
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}

                      {renderHoverActions && (
                        <td className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-100">
                          <div className="pointer-events-auto flex gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                            {renderHoverActions(row.original)}
                          </div>
                        </td>
                      )}
                    </tr>

                    {row.getIsExpanded() && renderExpandedRow && (
                      <tr className="border-l-4 border-l-blue-500 bg-blue-50/50">
                        <td colSpan={row.getVisibleCells().length} className="p-0">
                          <div className="border-t border-slate-200 px-4 py-3">
                            {renderExpandedRow(row.original)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
