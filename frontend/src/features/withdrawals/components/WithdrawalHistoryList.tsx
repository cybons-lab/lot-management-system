import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import { getWithdrawals, type WithdrawalResponse } from "../api";

import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { fmt } from "@/shared/utils/number";

interface WithdrawalHistoryListProps {
  productId: number;
  warehouseId: number;
}

/* eslint-disable max-lines-per-function */
export function WithdrawalHistoryList({ productId, warehouseId }: WithdrawalHistoryListProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["withdrawals", "list", { productId, warehouseId }],
    queryFn: () =>
      getWithdrawals({
        product_id: productId,
        warehouse_id: warehouseId,
        limit: 100, // 直近100件を表示
      }),
  });

  const columns: Column<WithdrawalResponse>[] = [
    {
      id: "ship_date",
      header: "出庫日",
      cell: (row) => format(new Date(row.ship_date), "yyyy/MM/dd"),
      sortable: true,
    },
    {
      id: "quantity",
      header: "数量",
      cell: (row) => <span className="font-medium">{fmt(row.quantity)}</span>,
      sortable: true,
      align: "right",
    },
    {
      id: "type",
      header: "区分",
      cell: (row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {row.withdrawal_type_label}
        </span>
      ),
    },
    {
      id: "destination",
      header: "出庫先 / 理由",
      cell: (row) => {
        if (row.customer_name) {
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{row.customer_name}</span>
              {row.delivery_place_name && (
                <span className="text-xs text-slate-500">{row.delivery_place_name}</span>
              )}
            </div>
          );
        }
        return <span className="text-sm text-slate-600">{row.reason || "-"}</span>;
      },
    },
    {
      id: "lot_number",
      header: "ロット番号",
      cell: (row) => <span className="font-mono text-xs">{row.lot_number}</span>,
    },
    {
      id: "user",
      header: "担当者",
      cell: (row) => row.withdrawn_by_name || "-",
      align: "center",
    },
  ];

  // Deduplicate data
  const uniqueData = useMemo(() => {
    const seen = new Set();
    return (data?.withdrawals || []).filter((item) => {
      if (seen.has(item.withdrawal_id)) return false;
      seen.add(item.withdrawal_id);
      return true;
    });
  }, [data?.withdrawals]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorFallback error={error} resetError={refetch} title="出庫履歴の取得に失敗しました" />
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <DataTable
        data={uniqueData}
        columns={columns}
        getRowId={(row) => row.withdrawal_id}
        isLoading={isLoading}
        emptyMessage="出庫履歴はありません"
      />
    </div>
  );
}
