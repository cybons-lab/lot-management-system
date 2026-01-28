import { type InventoryItem } from "@/features/inventory/api";
import { type Column } from "@/shared/components/data/DataTable";
import { formatDecimal, parseDecimal } from "@/shared/utils/decimal";

export const inventoryColumns: Column<InventoryItem>[] = [
  {
    id: "product",
    header: "製品",
    accessor: (row) =>
      row.product_name
        ? `${row.product_name} (${row.product_code || ""})`
        : row.product_code || `ID: ${row.product_group_id}`,
    cell: (row) => (
      <div className="flex flex-col">
        <span className="block truncate font-medium text-slate-900" title={row.product_name || ""}>
          {row.product_name || "名称未設定"}
        </span>
        <span className="text-[11px] text-slate-500">{row.product_code || "-"}</span>
      </div>
    ),
    width: 250,
    sortable: true,
  },
  {
    id: "supplier",
    header: "仕入先",
    accessor: (row) => {
      if (row.supplier_code) {
        return `${row.supplier_name} (${row.supplier_code})`;
      }
      if (row.suppliers_summary) {
        const { primary_supplier_code, other_count } = row.suppliers_summary;
        return other_count > 0 ? `${primary_supplier_code} +${other_count}` : primary_supplier_code;
      }
      return "-";
    },
    cell: (row) => {
      if (row.supplier_code) {
        return (
          <div className="flex flex-col">
            <span
              className="block truncate font-medium text-slate-700"
              title={row.supplier_name || ""}
            >
              {row.supplier_name || "名称未設定"}
            </span>
            <span className="text-[11px] text-slate-500">{row.supplier_code || "-"}</span>
          </div>
        );
      }
      if (row.suppliers_summary) {
        const { primary_supplier_name, primary_supplier_code, other_count } = row.suppliers_summary;
        return (
          <div className="flex flex-col">
            <span
              className="block truncate font-medium text-slate-700"
              title={primary_supplier_name}
            >
              {primary_supplier_name}
              {other_count > 0 && (
                <span className="ml-1 text-[10px] text-blue-600">+{other_count}社</span>
              )}
            </span>
            <span className="text-[11px] text-slate-500">{primary_supplier_code}</span>
          </div>
        );
      }
      return <span className="text-slate-400">-</span>;
    },
    width: 180,
    sortable: true,
  },
  {
    id: "warehouse",
    header: "倉庫",
    accessor: (row) =>
      row.warehouse_name
        ? `${row.warehouse_name} (${row.warehouse_code || ""})`
        : row.warehouse_code || `ID: ${row.warehouse_id}`,
    cell: (row) => (
      <div className="flex flex-col">
        <span
          className="block truncate font-medium text-slate-700"
          title={row.warehouse_name || ""}
        >
          {row.warehouse_name || "名称未設定"}
        </span>
        <span className="text-[11px] text-slate-500">{row.warehouse_code || "-"}</span>
      </div>
    ),
    width: 180,
    sortable: true,
  },
  {
    id: "lots",
    header: "ロット数",
    accessor: (row) => row.active_lot_count,
    cell: (row) => (
      <div className="flex items-center gap-1.5">
        <span>{row.active_lot_count}</span>
        {row.inventory_state === "no_lots" && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">⛔ なし</span>
        )}
        {row.inventory_state === "depleted_only" && (
          <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-700">
            ⚠️ 0
          </span>
        )}
      </div>
    ),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "total",
    header: "総在庫数",
    accessor: (row) => row.total_quantity,
    cell: (row) => formatDecimal(parseDecimal(row.total_quantity)),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "soft",
    header: "仮引当",
    accessor: (row) => row.soft_allocated_quantity,
    cell: (row) => (
      <span className="text-orange-600">
        {formatDecimal(parseDecimal(row.soft_allocated_quantity))}
      </span>
    ),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "hard",
    header: "確定引当",
    accessor: (row) => row.hard_allocated_quantity,
    cell: (row) => (
      <span className="font-medium text-red-600">
        {formatDecimal(parseDecimal(row.hard_allocated_quantity))}
      </span>
    ),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "available",
    header: "利用可能",
    accessor: (row) => row.available_quantity,
    cell: (row) => (
      <span className="font-medium text-green-600">
        {formatDecimal(parseDecimal(row.available_quantity))}
      </span>
    ),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "updated",
    header: "最終更新",
    accessor: (row) => row.last_updated,
    cell: (row) => (
      <span className="text-gray-600">{new Date(row.last_updated).toLocaleString("ja-JP")}</span>
    ),
    width: 180,
    sortable: true,
  },
];
