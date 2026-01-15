/**
 * IntakeHistoryList
 *
 * 入庫履歴一覧テーブルコンポーネント
 */
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { useIntakeHistory } from "../hooks";

import type { IntakeHistoryResponse } from "../api";

import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { fmt } from "@/shared/utils/number";

interface IntakeHistoryListProps {
  supplierId?: number;
  warehouseId?: number;
  productId?: number;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export function IntakeHistoryList({
  supplierId,
  warehouseId,
  productId,
  searchQuery,
  startDate,
  endDate,
}: IntakeHistoryListProps) {
  const { data, isLoading, isError, error, refetch } = useIntakeHistory({
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    product_id: productId,
    search: searchQuery,
    start_date: startDate,
    end_date: endDate,
    limit: 100,
  });

  const columns: Column<IntakeHistoryResponse>[] = [
    {
      id: "received_date",
      header: "入庫日",
      cell: (row) => format(new Date(row.received_date), "yyyy/MM/dd"),
      sortable: true,
    },
    {
      id: "lot_number",
      header: "ロット番号",
      cell: (row) => <span className="font-mono text-xs">{row.lot_number}</span>,
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
    },
    {
      id: "quantity",
      header: "数量",
      cell: (row) => <span className="font-medium text-green-600">{fmt(row.quantity)}</span>,
      sortable: true,
      align: "right",
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
    },
    {
      id: "warehouse",
      header: "倉庫",
      cell: (row) => row.warehouse_name || "-",
    },
    {
      id: "expiry_date",
      header: "有効期限",
      cell: (row) =>
        row.expiry_date ? format(new Date(row.expiry_date), "yyyy/MM/dd") : "-",
      sortable: true,
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
        data={data?.intakes || []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="入庫履歴はありません"
      />
    </div>
  );
}
