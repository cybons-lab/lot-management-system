/**
 * DataTable.tsx
 *
 * 汎用データテーブルコンポーネント
 * - カラム定義ベースの表示
 * - ソート機能
 * - 行選択機能
 * - アクションボタン
 * - レスポンシブ対応
 */

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
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
  accessor?: (row: T) => never;
  /** セルのレンダリング関数(カスタム表示) */
  cell?: (row: T) => React.ReactNode;
  /** ソート可能かどうか */
  sortable?: boolean;
  /** カラム幅(CSS) */
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
}: DataTableProps<T>) {
  // 全選択の状態
  const allSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) => selectedIds.includes(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const someSelected = useMemo(() => {
    if (data.length === 0) return false;
    return selectedIds.length > 0 && !allSelected;
  }, [data.length, selectedIds.length, allSelected]);

  // 全選択/全解除
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(getRowId));
    }
  };

  // 行選択
  const handleSelectRow = (rowId: string | number) => {
    if (!onSelectionChange) return;

    if (selectedIds.includes(rowId)) {
      onSelectionChange(selectedIds.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedIds, rowId]);
    }
  };

  // ソート処理
  const handleSort = (columnId: string) => {
    if (!onSortChange) return;

    const newDirection = sort?.column === columnId && sort.direction === "asc" ? "desc" : "asc";

    onSortChange({
      column: columnId,
      direction: newDirection,
    });
  };

  // ソートアイコン
  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (!sort || sort.column !== columnId) {
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
    }

    return sort.direction === "asc" ? (
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
    <div className={cn("relative overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {/* 選択チェックボックス列 */}
            {selectable && (
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="すべて選択"
                />
              </th>
            )}

            {/* カラムヘッダー */}
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  "px-4 py-3 text-sm font-medium text-gray-700",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.className,
                )}
                style={{ width: column.width }}
              >
                {column.sortable && onSortChange ? (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="inline-flex items-center transition-colors hover:text-gray-900"
                  >
                    {column.header}
                    <SortIcon columnId={column.id} />
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}

            {/* アクション列 */}
            {rowActions && (
              <th className="w-24 px-4 py-3 text-right text-sm font-medium text-gray-700">
                アクション
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {data.map((row) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);

            return (
              <tr
                key={String(rowId)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-gray-50",
                  isSelected && "bg-blue-50",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {/* 選択チェックボックス */}
                {selectable && (
                  <td className="px-4 py-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(rowId)}
                      aria-label="行を選択"
                    />
                  </td>
                )}

                {/* データセル */}
                {columns.map((column) => {
                  const value = column.accessor ? column.accessor(row) : null;
                  const cellContent = column.cell ? column.cell(row) : value;

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-3 text-sm text-gray-900",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.className,
                      )}
                    >
                      {cellContent}
                    </td>
                  );
                })}

                {/* アクションボタン */}
                {rowActions && (
                  <td
                    className="px-4 py-3 text-right text-sm"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
