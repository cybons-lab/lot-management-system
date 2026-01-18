/**
 * IntakeHistoryList
 *
 * 入庫履歴一覧テーブルコンポーネント
 */
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useMemo } from "react";

import type { IntakeHistoryResponse } from "../api";
import { useIntakeHistory } from "../hooks";

import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { fmt } from "@/shared/utils/number";

interface IntakeHistoryListProps {
  supplierId?: number;
  warehouseId?: number;
  productId?: number;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  isCompact?: boolean;
}

// eslint-disable-next-line max-lines-per-function
export function IntakeHistoryList({
  supplierId,
  warehouseId,
  productId,
  searchQuery,
  startDate,
  endDate,
  isCompact = false,
}: IntakeHistoryListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, error, refetch } = useIntakeHistory({
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    product_id: productId,
    search: searchQuery,
    start_date: startDate,
    end_date: endDate,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  const allColumns: (Column<IntakeHistoryResponse> & { hidden?: boolean })[] = [
    {
      id: "received_date",
      header: "入庫日",
      cell: (row) => format(new Date(row.received_date), "yyyy/MM/dd"),
      sortable: true,
      width: 100,
    },
    {
      id: "lot_number",
      header: "ロット番号",
      cell: (row) => <span className="font-mono text-xs">{row.lot_number}</span>,
      width: 120,
    },
    {
      id: "product",
      header: "製品",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.product_name}</span>
          <span className="text-xs text-slate-500">{row.product_code}</span>
        </div>
      ),
      hidden: isCompact,
    },
    {
      id: "quantity",
      header: "数量",
      cell: (row) => <span className="font-medium text-green-600">{fmt(row.quantity)}</span>,
      sortable: true,
      align: "right",
      width: 80,
    },
    {
      id: "supplier",
      header: "仕入先",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.supplier_name || "-"}</span>
          {row.supplier_code && <span className="text-xs text-slate-500">{row.supplier_code}</span>}
        </div>
      ),
      hidden: isCompact,
    },
    {
      id: "warehouse",
      header: "倉庫",
      cell: (row) => row.warehouse_name || "-",
      hidden: isCompact,
    },
    {
      id: "expiry_date",
      header: "有効期限",
      cell: (row) => (row.expiry_date ? format(new Date(row.expiry_date), "yyyy/MM/dd") : "-"),
      sortable: true,
      width: 100,
    },
    {
      id: "inbound_plan",
      header: "入庫計画",
      cell: (row) => (
        <div className="flex flex-col">
          {row.inbound_plan_number ? (
            <>
              <span className="text-xs">{row.inbound_plan_number}</span>
              {row.sap_po_number && (
                <span className="text-xs text-slate-500">SAP: {row.sap_po_number}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      ),
    },
  ];

  const columns = allColumns.filter((col) => !col.hidden);

  // Deduplicate intakes
  const uniqueIntakes = useMemo(() => {
    const seen = new Set();
    return (data?.intakes || []).filter((item) => {
      if (seen.has(item.intake_id)) return false;
      seen.add(item.intake_id);
      return true;
    });
  }, [data?.intakes]);

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
      {data && data.total > 0 && (
        <TablePagination
          currentPage={page}
          pageSize={pageSize}
          totalCount={data.total}
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
