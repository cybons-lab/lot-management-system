/**
 * LotTable.tsx
 *
 * ロット一覧テーブルコンポーネント
 */

import { useMemo } from "react";

import { createLotColumns } from "../utils/lot-columns";

import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import type { LotUI } from "@/shared/libs/normalize";
import { getLotStatuses } from "@/shared/utils/status";

export interface LotTableProps {
  /** ロット一覧データ */
  lots: LotUI[];
  /** テーブル状態管理フック */
  table: {
    sortData: <D extends Record<string, unknown>>(data: D[]) => D[];
    paginateData: <D>(data: D[]) => D[];
    calculatePagination: (totalItems: number) => {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
    sort: {
      column: string | null;
      direction: "asc" | "desc" | null;
    };
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
  };
  /** ローディング状態 */
  isLoading: boolean;
  /** エラー状態 */
  error: Error | null;
  /** ソート変更時のコールバック */
  onSortChange?: (column: string) => void;
  /** 行選択（チェックボックス）を表示するか */
  selectable?: boolean;
  /** 選択された行のID配列 */
  selectedIds?: number[];
  /** 選択変更時のコールバック */
  onSelectionChange?: (ids: number[]) => void;
}

/**
 * ソート状態を取得
 */
function getSortConfig(sort: { column: string | null; direction: "asc" | "desc" | null }) {
  if (sort.column && sort.direction) {
    return { column: sort.column, direction: sort.direction };
  }
  return undefined;
}

/**
 * ロット一覧テーブル
 */
export function LotTable({
  lots,
  table,
  isLoading,
  error,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: LotTableProps) {
  // カラム定義
  const columns = useMemo(() => createLotColumns(), []);

  // データの加工
  const sortedLots = table.sortData(lots);
  const paginatedLots = table.paginateData(sortedLots);
  const totalCount = sortedLots.length || 0;
  const pagination = table.calculatePagination(totalCount);
  const sortConfig = getSortConfig(table.sort);
  const showPagination = !isLoading && !error && totalCount > 0;

  // エラー表示
  if (error) return null;

  return (
    <>
      <DataTable
        data={paginatedLots}
        columns={columns}
        {...(sortConfig ? { sort: sortConfig } : {})}
        {...(onSortChange ? { onSortChange: (sort) => onSortChange(sort.column) } : {})}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => onSelectionChange?.(ids as number[])}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        getRowClassName={(lot) => {
          const [primaryStatus] = getLotStatuses(lot);
          if (primaryStatus === "expired") return "bg-red-50/70 hover:bg-red-100";
          if (primaryStatus === "rejected") return "bg-rose-50/70 hover:bg-rose-100";
          if (primaryStatus === "qc_hold") return "bg-amber-50/70 hover:bg-amber-100";
          if (primaryStatus === "pending_receipt") return "bg-amber-100/80 hover:bg-amber-200";
          if (primaryStatus === "empty") return "bg-slate-50/70 hover:bg-slate-100";
          return "";
        }}
        emptyMessage="ロットがありません。新規登録ボタンから最初のロットを作成してください。"
      />

      {showPagination && (
        <TablePagination
          currentPage={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalItems}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      )}
    </>
  );
}
