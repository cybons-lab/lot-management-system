/**
 * OrderLineColumns.tsx
 * 受注明細行のカラム定義
 */

import { CheckCircle, Circle, CircleDot, Clipboard, Link, Package, Zap } from "lucide-react";

import { Button } from "@/components/ui";
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
  options: OrderLineColumnsOptions = {},
): Column<OrderLineRow>[] {
  const { onAllocate } = options;
  return [
    // 種別（アイコン化）
    {
      id: "order_type",
      header: "需要種別",
      accessor: (row: OrderLineRow) => (row.order_type as string) || "ORDER",
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
      accessor: (row: OrderLineRow) => row.customer_name ?? "",
      cell: (row: OrderLineRow) => {
        let isInactiveCustomer = false;
        if (row.customer_valid_to) {
          const todayStr = new Date().toISOString().split("T")[0];
          if (row.customer_valid_to < todayStr) {
            isInactiveCustomer = true;
          }
        }
        return (
          <div>
            <div
              className={`truncate font-medium ${isInactiveCustomer ? "text-slate-500 line-through" : "text-slate-900"}`}
              title={row.customer_name ?? ""}
            >
              {row.customer_name}
              {isInactiveCustomer && (
                <span className="ml-1 text-xs font-normal text-red-500 no-underline">(無効)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">{row.customer_code}</div>
          </div>
        );
      },
      minWidth: 200,
    },

    // 商品
    {
      id: "product_code",
      header: "商品",
      accessor: (row: OrderLineRow) => row.product_code ?? "",
      cell: (row: OrderLineRow) => (
        <div>
          <div className="text-sm font-medium text-slate-600">{row.product_code ?? "–"}</div>
          {row.product_name && (
            <div className="truncate text-sm font-medium text-slate-900" title={row.product_name}>
              {row.product_name}
            </div>
          )}
        </div>
      ),
      minWidth: 300,
    },

    // 納入先
    {
      id: "delivery_place",
      header: "納入先",
      accessor: (row: OrderLineRow) =>
        row.delivery_place_name ?? row.delivery_place_code ?? row.delivery_place ?? "",
      cell: (row: OrderLineRow) => {
        const deliveryPlaceName = row.delivery_place_name ?? row.delivery_place ?? "納入先未設定";
        return (
          <div>
            <div className="truncate text-sm font-medium text-slate-900" title={deliveryPlaceName}>
              {deliveryPlaceName}
            </div>
            {row.delivery_place_code && (
              <div className="text-[11px] text-slate-500">{row.delivery_place_code}</div>
            )}
          </div>
        );
      },
      minWidth: 220,
    },

    // 注文数量（単位を小さく）
    {
      id: "order_quantity",
      header: "注文数量",
      accessor: (row: OrderLineRow) => Number(row.order_quantity ?? row.quantity ?? 0),
      cell: (row: OrderLineRow) => {
        const qty = Number(row.order_quantity ?? row.quantity ?? 0);
        return (
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-base font-medium text-slate-900 tabular-nums">
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
      accessor: (row: OrderLineRow) => {
        const lots = coerceAllocatedLots(row.allocated_lots);
        return lots.reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
      },
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
              <span className="text-base font-medium text-slate-900 tabular-nums">
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
      accessor: (row: OrderLineRow) => {
        const orderQty = Number(row.order_quantity ?? row.quantity ?? 0);
        const lots = coerceAllocatedLots(row.allocated_lots);
        const allocatedQty = lots.reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
        return orderQty > 0 ? (allocatedQty / orderQty) * 100 : 0;
      },
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
      width: "160px",
    },

    // 納期
    {
      id: "due_date",
      header: "納期",
      accessor: (row: OrderLineRow) => row.delivery_date ?? row.due_date ?? "",
      cell: (row: OrderLineRow) => {
        const dueDate = row.delivery_date ?? row.due_date ?? null;
        return <div className="text-slate-900">{formatDate(dueDate)}</div>;
      },
      width: "100px",
    },

    // 引当状況（アイコン化）
    {
      id: "status",
      header: "状況",
      accessor: (row: OrderLineRow) => {
        const orderQty = Number(row.order_quantity ?? row.quantity ?? 0);
        const lots = coerceAllocatedLots(row.allocated_lots);
        const allocatedQty = lots.reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
        return orderQty > 0 ? (allocatedQty / orderQty) * 100 : 0;
      },
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

    // 操作
    {
      id: "actions",
      header: "操作",
      cell: (row: OrderLineRow) => {
        let isInactiveCustomer = false;
        if (row.customer_valid_to) {
          const todayStr = new Date().toISOString().split("T")[0];
          if (row.customer_valid_to < todayStr) {
            isInactiveCustomer = true;
          }
        }

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-slate-300 text-xs hover:border-slate-400 hover:bg-slate-50"
            disabled={isInactiveCustomer}
            title={isInactiveCustomer ? "無効な得意先のため操作できません" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onAllocate?.(row);
            }}
          >
            引当
          </Button>
        );
      },
      align: "right",
      width: "80px",
      enableHiding: false,
    },
  ];
}

/**
 * 後方互換性のためのデフォルトエクスポート（非推奨）
 * @deprecated createOrderLineColumns() を使用してください
 */
export const orderLineColumns = createOrderLineColumns();
