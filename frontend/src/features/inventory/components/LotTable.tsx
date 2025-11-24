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

interface LotTableProps {
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
export function LotTable({ lots, table, isLoading, error }: LotTableProps) {
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
        sort={sortConfig}
        isLoading={isLoading}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        getRowClassName={(lot) =>
          lot.status === "locked" ? "bg-amber-50/70 hover:bg-amber-100" : ""
        }
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
