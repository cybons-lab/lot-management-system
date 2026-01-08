/**
 * DataTable.tsx
 *
 * 汎用データテーブルコンポーネント (TanStack Table Refactor)
 * - カラム定義ベースの表示
 * - ソート機能 (Controlled)
 * - 行選択機能 (Controlled)
 * - アクションボタン
 * - レスポンシブ対応
 * - 列幅変更機能 (New)
 */

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

import { Checkbox } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

export interface Column<T = never> {
  /** カラムID */
  id: string;
  /** カラムヘッダー表示名 */
  header: string;
  /** セルの値を取得する関数 */
  accessor?: (row: T) => unknown;
  /** セルのレンダリング関数(カスタム表示) */
  cell?: (row: T) => React.ReactNode;
  /** ソート可能かどうか */
  sortable?: boolean;
  /** カラム幅(CSS) - TanStack Tableでは数値推奨だが互換性のため文字列も許容(パースして使用) */
  width?: string;
  /** テキスト配置 */
  align?: "left" | "center" | "right";
  /** カラムのクラス名 */
  className?: string;
}

export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export interface DataTableProps<T = never> {
  /** 表示データ */
  data: T[];
  /** カラム定義 */
  columns: Column<T>[];
  /** ソート設定 */
  sort?: SortConfig;
  /** ソート変更時のコールバック */
  onSortChange?: (sort: SortConfig) => void;
  /** 行選択を有効化 */
  selectable?: boolean;
  /** 選択された行のID配列 */
  selectedIds?: (string | number)[];
  /** 行選択変更時のコールバック */
  onSelectionChange?: (ids: (string | number)[]) => void;
  /** 行のID取得関数 */
  getRowId?: (row: T) => string | number;
  /** 行クリック時のコールバック */
  onRowClick?: (row: T) => void;
  /** 行のアクションボタン */
  rowActions?: (row: T) => React.ReactNode;
  /** 空データ時のメッセージ */
  emptyMessage?: string;
  /** ローディング状態 */
  isLoading?: boolean;
  /** テーブルのクラス名 */
  className?: string;
  /** 行のクラス名取得関数 */
  getRowClassName?: (row: T) => string;
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
  emptyMessage = "データがありません",
  isLoading = false,
  className,
  getRowClassName,
}: DataTableProps<T>) {
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
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="行を選択"
            />
          </div>
        ),
        size: 48, // w-12 equivalent
        enableResizing: false,
      });
    }

    // データ列
    columns.forEach((col) => {
      // 幅の解析 (例: "200px" -> 200)
      const parseWidth = (w?: string) => {
        if (!w) return undefined;
        const match = w.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : undefined;
      };

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
        enableSorting: col.sortable,
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
          <div onClick={(e) => e.stopPropagation()}>{rowActions(row.original)}</div>
        ),
        size: 96, // w-24 equivalent
        enableResizing: false,
        meta: {
          align: "right",
        },
      });
    }

    return defs;
  }, [columns, selectable, rowActions]);

  // ソート状態の変換
  const sorting = useMemo<SortingState>(() => {
    if (!sort) return [];
    return [{ id: sort.column, desc: sort.direction === "desc" }];
  }, [sort]);

  // 行選択状態の変換
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedIds.forEach((id) => {
      // TanStack Table uses row index by default but we can configure it to use rowId
      // However, here we are mapping external ID to selection state.
      // We need to map row ID to table row ID.
      // But wait, Tanstack table `getRowId` option can solve this.
      selection[String(id)] = true;
    });
    return selection;
  }, [selectedIds]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
    },
    columnResizeMode: "onChange",
    getRowId: (row) => String(getRowId(row)),
    onSortingChange: (updaterOrValue) => {
      // Controlled mode: we only call onSortChange
      // We need to calculate next state to determine direction
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
      const selectedIdList = Object.keys(nextSelection);
      onSelectionChange(selectedIdList);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side or external sorting
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

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">読み込み中...</p>
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
    <div className={cn("relative overflow-x-auto rounded-md border", className)}>
      <table className="w-full border-collapse" style={{ width: table.getTotalSize() }}>
        <thead className="border-b border-slate-200 bg-slate-50/30">
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
                      "relative px-6 py-4 text-left text-sm font-semibold text-slate-700",
                      meta?.align === "center" && "text-center",
                      meta?.align === "right" && "text-right",
                      meta?.className,
                    )}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
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
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none bg-slate-200 opacity-50 transition-colors select-none hover:bg-blue-400 hover:opacity-100 ${
                          header.column.getIsResizing() ? "bg-blue-600 opacity-100" : ""
                        }`}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-200">
          {table.getRowModel().rows.map((row) => {
            const customClassName = getRowClassName?.(row.original);
            return (
              <tr
                key={row.id}
                className={cn(
                  "bg-white transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50",
                  row.getIsSelected() && "bg-blue-50",
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
                        "px-6 py-4 text-sm text-slate-900",
                        meta?.align === "center" && "text-center",
                        meta?.align === "right" && "text-right",
                        meta?.className,
                      )}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
