/**
 * IntakeHistoryList
 *
 * 入庫履歴一覧テーブルコンポーネント
 */
import { Loader2 } from "lucide-react";

import { useIntakeTable } from "../hooks/useIntakeTable";

import { getIntakeHistoryColumns } from "./IntakeHistoryColumns";

import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";

interface IntakeHistoryListProps {
  supplierId?: number;
  warehouseId?: number;
  productId?: number;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  isCompact?: boolean;
}

export function IntakeHistoryList({
  supplierId,
  warehouseId,
  productId,
  searchQuery,
  startDate,
  endDate,
  isCompact = false,
}: IntakeHistoryListProps) {
  const {
    uniqueIntakes,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading,
    isError,
    error,
    refetch,
  } = useIntakeTable({
    supplierId,
    warehouseId,
    productId,
    searchQuery,
    startDate,
    endDate,
  });

  const columns = getIntakeHistoryColumns(isCompact);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorFallback error={error} resetError={refetch} title="入庫履歴の取得に失敗しました" />
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <DataTable
        data={uniqueIntakes}
        columns={columns}
        getRowId={(row) => row.intake_id}
        isLoading={isLoading}
        emptyMessage="入庫履歴はありません"
      />
      {total > 0 && (
        <TablePagination
          currentPage={page}
          pageSize={pageSize}
          totalCount={total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
