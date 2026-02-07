import { format } from "date-fns";

import type { IntakeHistoryResponse } from "../api";

import type { Column } from "@/shared/components/data/DataTable";
import { fmt } from "@/shared/utils/number";

export const getIntakeHistoryColumns = (isCompact: boolean): Column<IntakeHistoryResponse>[] => {
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

  return allColumns.filter((col) => !col.hidden);
};
