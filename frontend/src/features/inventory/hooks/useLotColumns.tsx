// テーブルカラム定義を一箇所にまとめるため分割しない
/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { useMemo } from "react";

import { LotActionCell } from "@/features/inventory/components/LotActionCell";
import type { Column } from "@/shared/components/data/DataTable";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

interface UseLotColumnsProps {
  viewMode: "grouped" | "flat";
  onEdit: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
}

export function useLotColumns({ viewMode, onEdit, onLock, onUnlock }: UseLotColumnsProps) {
  const baseColumns: Column<LotUI>[] = useMemo(
    () => [
      {
        id: "lot_number",
        header: "ロット番号",
        cell: (lot) => (
          <div className="flex items-center gap-2">
            {lot.status === "locked" && <Lock className="h-4 w-4 text-slate-400" />}
            <span className="font-medium">{lot.lot_number || "-"}</span>
          </div>
        ),
        sortable: true,
        width: "200px",
      },
      {
        id: "current_quantity",
        header: "現在在庫",
        cell: (lot) => {
          const qty = Number(lot.current_quantity);
          return <span className={qty > 0 ? "font-semibold" : "text-slate-400"}>{fmt(qty)}</span>;
        },
        sortable: true,
        align: "right",
        width: "120px",
      },
      {
        id: "unit",
        header: "単位",
        cell: (lot) => lot.unit,
        align: "left",
        width: "80px",
      },
      {
        id: "receipt_date",
        header: "入荷日",
        cell: (lot) =>
          lot.receipt_date && lot.receipt_date !== "-"
            ? format(new Date(lot.receipt_date), "yyyy/MM/dd")
            : "-",
        sortable: true,
        width: "120px",
      },
      {
        id: "expiry_date",
        header: "有効期限",
        cell: (lot) =>
          lot.expiry_date && lot.expiry_date !== "-"
            ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
            : "-",
        sortable: true,
        width: "120px",
      },
      {
        id: "status",
        header: "ステータス",
        cell: (lot) => {
          const statuses = getLotStatuses(lot);
          return (
            <div className="flex items-center gap-1">
              {statuses.map((s) => (
                <LotStatusIcon key={s} status={s} />
              ))}
            </div>
          );
        },
        sortable: true,
        align: "left",
        width: "120px",
      },
      {
        id: "actions",
        header: "",
        cell: (lot) => (
          <LotActionCell lot={lot} onEdit={onEdit} onLock={onLock} onUnlock={onUnlock} />
        ),
      },
    ],
    [onEdit, onLock, onUnlock],
  );

  const flatColumns: Column<LotUI>[] = useMemo(
    () => [
      baseColumns[0], // lot_number
      {
        id: "product_code",
        header: "メーカー品番",
        cell: (lot) => <span className="whitespace-nowrap">{lot.product_code ?? "–"}</span>,
        sortable: true,
      },
      {
        id: "product_name",
        header: "製品名",
        cell: (lot) => <span className="whitespace-nowrap">{lot.product_name ?? "–"}</span>,
      },
      {
        id: "supplier_name",
        header: "仕入先",
        cell: (lot) => <span className="whitespace-nowrap">{lot.supplier_name ?? "–"}</span>,
        sortable: true,
        width: "200px",
      },
      ...baseColumns.slice(1), // current_quantity以降
    ],
    [baseColumns],
  );

  return viewMode === "grouped" ? baseColumns : flatColumns;
}
