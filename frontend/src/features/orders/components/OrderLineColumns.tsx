/**
 * OrderLineColumns.tsx
 * 受注明細行のカラム定義
 */

import { Link } from "react-router-dom";

import { AllocationStatusBadge } from "./display/AllocationStatusBadge";

import { Button } from "@/components/ui";
import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import type { Column } from "@/shared/components/data/DataTable";
import { coerceAllocatedLots } from "@/shared/libs/allocations";
import { formatDate } from "@/shared/utils/date";
import { formatOrderCode } from "@/shared/utils/order";

export const orderLineColumns: Column<OrderLineRow>[] = [
  {
    id: "order_code",
    header: "受注番号",
    cell: (row: OrderLineRow) => (
      <div className="max-w-[140px]">
        <Link to={`/orders/${row.order_id}`} className="font-medium text-blue-600 hover:underline">
          {formatOrderCode(row)}
        </Link>
        {/* 業務キー表示 */}
        {row.customer_order_no && (
          <div className="text-xs text-slate-500">得: {row.customer_order_no}</div>
        )}
        {row.sap_order_no && <div className="text-xs text-slate-400">SAP: {row.sap_order_no}</div>}
      </div>
    ),
    width: "140px",
  },
  {
    id: "order_type",
    header: "種別",
    cell: (row: OrderLineRow) => {
      const typeMap: Record<string, { label: string; color: string }> = {
        FORECAST_LINKED: { label: "FC連携", color: "bg-purple-100 text-purple-800" },
        KANBAN: { label: "かんばん", color: "bg-orange-100 text-orange-800" },
        SPOT: { label: "スポット", color: "bg-pink-100 text-pink-800" },
        ORDER: { label: "通常受注", color: "bg-slate-100 text-slate-800" },
      };
      const orderType = (row.order_type as string) || "ORDER";
      const info = typeMap[orderType] || typeMap["ORDER"];
      return (
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${info.color}`}>
          {info.label}
        </span>
      );
    },
    width: "80px",
  },
  {
    id: "customer_name",
    header: "得意先",
    cell: (row: OrderLineRow) => (
      <div className="max-w-[180px]">
        <div className="truncate font-bold text-slate-900" title={row.customer_name ?? ""}>
          {row.customer_name}
        </div>
        <div className="text-xs text-slate-500">{row.customer_code}</div>
      </div>
    ),
    width: "180px",
  },
  {
    id: "product_code",
    header: "製品",
    cell: (row: OrderLineRow) => (
      <div className="max-w-[250px]">
        <div className="font-medium text-slate-900">{row.product_code ?? "–"}</div>
        {row.product_name && (
          <div className="truncate font-bold text-slate-700" title={row.product_name}>
            {row.product_name}
          </div>
        )}
      </div>
    ),
    width: "250px",
  },
  {
    id: "order_quantity",
    header: "注文数量",
    cell: (row: OrderLineRow) => {
      const qty = Number(row.order_quantity ?? row.quantity ?? 0);
      return (
        <div className="font-bold text-slate-900">
          {qty.toLocaleString()} {row.unit ?? ""}
        </div>
      );
    },
    align: "right",
    width: "120px",
  },
  {
    id: "allocated_quantity",
    header: "引当数量",
    cell: (row: OrderLineRow) => {
      const lots = coerceAllocatedLots(row.allocated_lots);
      const allocatedQty = lots.reduce(
        (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
        0,
      );
      // Soft引当が含まれているか判定
      const hasSoft = lots.some((a) => a.allocation_type === "soft");

      return (
        <div className="flex flex-col items-end">
          <span className="font-medium text-slate-900">
            {allocatedQty.toLocaleString()} {row.unit ?? ""}
          </span>
          {hasSoft && <span className="text-[10px] font-medium text-amber-600">(内Softあり)</span>}
        </div>
      );
    },
    align: "right",
    width: "120px",
  },
  {
    id: "allocation_rate",
    header: "引当率",
    cell: (row: OrderLineRow) => {
      const orderQty = Number(row.order_quantity ?? row.quantity ?? 0);
      const lots = coerceAllocatedLots(row.allocated_lots);
      const allocatedQty = lots.reduce(
        (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
        0,
      );
      const rate = orderQty > 0 ? (allocatedQty / orderQty) * 100 : 0;

      return (
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                rate === 100 ? "bg-green-500" : rate > 0 ? "bg-blue-500" : "bg-slate-300"
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-700">{rate.toFixed(0)}%</span>
        </div>
      );
    },
    width: "180px",
  },
  {
    id: "due_date",
    header: "納期",
    cell: (row: OrderLineRow) => {
      // OrderLineRow now has due_date from parent order if line doesn't have it
      const dueDate = row.due_date ?? null;
      return <div className="font-bold text-slate-900">{formatDate(dueDate)}</div>;
    },
    width: "120px",
  },
  {
    id: "status",
    header: "引当状況",
    cell: (row: OrderLineRow) => {
      // Calculate soft and hard allocated quantities
      const lots = coerceAllocatedLots(row.allocated_lots);
      const softAllocated = lots
        .filter((a) => a.allocation_type === "soft")
        .reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
      const hardAllocated = lots
        .filter((a) => a.allocation_type === "hard")
        .reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );

      return <AllocationStatusBadge softAllocated={softAllocated} hardAllocated={hardAllocated} />;
    },
    width: "100px",
  },
  {
    id: "actions",
    header: "",
    cell: (row: OrderLineRow) => (
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to={`/orders/${row.order_id}`}>詳細 / 引当</Link>
        </Button>
      </div>
    ),
    width: "100px",
  },
];
