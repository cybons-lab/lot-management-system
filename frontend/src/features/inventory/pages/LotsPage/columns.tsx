import { format } from "date-fns";

import type { Column } from "@/shared/components/data/DataTable";
import { LotStatusBadge } from "@/shared/components/data/StatusBadge";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";

export const columns: Column<LotUI>[] = [
  {
    id: "lot_number",
    header: "ロット番号",
    cell: (lot: LotUI) => <span className="font-medium">{lot.lot_number}</span>,
    sortable: true,
  },
  {
    id: "product_code",
    header: "製品コード",
    cell: (lot: LotUI) => lot.product_code,
    sortable: true,
  },
  {
    id: "product_name",
    header: "製品名",
    cell: (lot: LotUI) => lot.product_name,
  },
  {
    id: "delivery_place_id",
    header: "納品場所",
    cell: (lot: LotUI): string | number => lot.delivery_place_id ?? "–",
    sortable: true,
  },
  {
    id: "current_quantity",
    header: "現在在庫",
    cell: (lot: LotUI) => {
      const qty = Number(lot.current_quantity);
      return <span className={qty > 0 ? "font-semibold" : "text-gray-400"}>{fmt(qty)}</span>;
    },
    sortable: true,
    align: "right",
  },
  {
    id: "unit",
    header: "単位",
    cell: (lot: LotUI): string => lot.unit,
    align: "center",
  },
  {
    id: "receipt_date",
    header: "入荷日",
    cell: (lot: LotUI) =>
      lot.receipt_date && lot.receipt_date !== "-"
        ? format(new Date(lot.receipt_date), "yyyy/MM/dd")
        : "-",
    sortable: true,
  },
  {
    id: "expiry_date",
    header: "有効期限",
    cell: (lot: LotUI) =>
      lot.expiry_date && lot.expiry_date !== "-"
        ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
        : "-",
    sortable: true,
  },
  {
    id: "status",
    header: "ステータス",
    cell: (lot: LotUI) => {
      const status = Number(lot.current_quantity) > 0 ? "available" : "depleted";
      return <LotStatusBadge status={status} />;
    },
    sortable: true,
    align: "center",
  },
];
