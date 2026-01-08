/**
 * OrderLineColumns.tsx
 * 受注明細行のカラム定義
 */

import { CheckCircle, Circle, CircleDot, Clipboard, Link, Package, Zap } from "lucide-react";

import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import type { Column } from "@/shared/components/data/DataTable";
import { coerceAllocatedLots } from "@/shared/libs/allocations";
import { formatDate } from "@/shared/utils/date";

interface OrderLineColumnsOptions {
  /** 引当ボタンクリック時のコールバック */
  onAllocate?: (row: OrderLineRow) => void;
}

/**
 * 受注明細カラム定義を生成するファクトリ関数
 *
 * @param options - コールバックなどのオプション
 * @returns カラム定義配列
 */
// eslint-disable-next-line max-lines-per-function -- カラム定義を1箇所にまとめて管理
export function createOrderLineColumns(
  _options: OrderLineColumnsOptions = {},
): Column<OrderLineRow>[] {
  return [
    // 種別（アイコン化）
    {
      id: "order_type",
      header: "",
      cell: (row: OrderLineRow) => {
        const iconMap = {
          FORECAST_LINKED: {
            Icon: Link,
            color: "text-purple-600",
            bg: "bg-purple-50",
            label: "FC連携",
          },
          KANBAN: {
            Icon: Clipboard,
            color: "text-orange-600",
            bg: "bg-orange-50",
            label: "かんばん",
          },
          SPOT: { Icon: Zap, color: "text-pink-600", bg: "bg-pink-50", label: "スポット" },
          ORDER: { Icon: Package, color: "text-slate-600", bg: "bg-slate-50", label: "通常受注" },
        };
        const orderType = (row.order_type as string) || "ORDER";
        const config = iconMap[orderType as keyof typeof iconMap] || iconMap["ORDER"];
        const IconComponent = config.Icon;

        return (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bg}`}
            title={config.label}
          >
            <IconComponent className={`h-4 w-4 ${config.color}`} />
          </div>
        );
      },
      width: "60px",
    },

    // 得意先
    {
      id: "customer_name",
      header: "得意先",
      cell: (row: OrderLineRow) => (
        <div className="max-w-[150px]">
          <div className="truncate font-semibold text-slate-900" title={row.customer_name ?? ""}>
            {row.customer_name}
          </div>
          <div className="text-[11px] text-slate-500">{row.customer_code}</div>
        </div>
      ),
      width: "150px",
    },

    // 製品
    {
      id: "product_code",
      header: "製品",
      cell: (row: OrderLineRow) => (
        <div className="max-w-[220px]">
          <div className="text-sm font-medium text-slate-600">{row.product_code ?? "–"}</div>
          {row.product_name && (
            <div className="truncate text-sm font-semibold text-slate-900" title={row.product_name}>
              {row.product_name}
            </div>
          )}
        </div>
      ),
      width: "220px",
    },

    // 注文数量（単位を小さく）
    {
      id: "order_quantity",
      header: "注文数量",
      cell: (row: OrderLineRow) => {
        const qty = Number(row.order_quantity ?? row.quantity ?? 0);
        return (
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-base font-semibold text-slate-900 tabular-nums">
              {qty.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">{row.unit}</span>
          </div>
        );
      },
      align: "right",
      width: "100px",
    },

    // 引当数量（単位を小さく）
    {
      id: "allocated_quantity",
      header: "引当数量",
      cell: (row: OrderLineRow) => {
        const lots = coerceAllocatedLots(row.allocated_lots);
        const allocatedQty = lots.reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
        const hasSoft = lots.some((a) => a.allocation_type === "soft");

        return (
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold text-slate-900 tabular-nums">
                {allocatedQty.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">{row.unit}</span>
            </div>
            {hasSoft && <span className="text-[10px] font-medium text-amber-600">(Soft含)</span>}
          </div>
        );
      },
      align: "right",
      width: "100px",
    },

    // 引当率（プログレスバー）
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
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  rate === 100 ? "bg-green-500" : rate > 0 ? "bg-blue-500" : "bg-slate-300"
                }`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs font-medium text-slate-600 tabular-nums">
              {rate.toFixed(0)}%
            </span>
          </div>
        );
      },
      width: "140px",
    },

    // 納期
    {
      id: "due_date",
      header: "納期",
      cell: (row: OrderLineRow) => {
        const dueDate = row.delivery_date ?? row.due_date ?? null;
        return <div className="font-semibold text-slate-900">{formatDate(dueDate)}</div>;
      },
      width: "100px",
    },

    // 引当状況（アイコン化）
    {
      id: "status",
      header: "",
      cell: (row: OrderLineRow) => {
        const orderQty = Number(row.order_quantity ?? row.quantity ?? 0);
        const lots = coerceAllocatedLots(row.allocated_lots);
        const allocatedQty = lots.reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
        const rate = orderQty > 0 ? (allocatedQty / orderQty) * 100 : 0;

        const statusConfig = {
          icon: rate === 0 ? Circle : rate === 100 ? CheckCircle : CircleDot,
          color: rate === 0 ? "text-red-500" : rate === 100 ? "text-green-500" : "text-blue-500",
          label: rate === 0 ? "未引当" : rate === 100 ? "引当済" : `部分引当 (${rate.toFixed(0)}%)`,
        };

        const IconComponent = statusConfig.icon;
        return (
          <div className="flex items-center justify-center" title={statusConfig.label}>
            <IconComponent className={`h-5 w-5 ${statusConfig.color}`} />
          </div>
        );
      },
      width: "50px",
    },
  ];
}

/**
 * 後方互換性のためのデフォルトエクスポート（非推奨）
 * @deprecated createOrderLineColumns() を使用してください
 */
export const orderLineColumns = createOrderLineColumns();
