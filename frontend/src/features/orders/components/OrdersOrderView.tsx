import { orderLineColumns } from "@/features/orders/components/OrderLineColumns";
import type { GroupedOrderLine } from "@/features/orders/utils/groupOrders";
import { DataTable } from "@/shared/components/data/DataTable";

interface OrdersOrderViewProps {
  groups: GroupedOrderLine[];
}

/**
 * 受注単位のグループ表示ビュー
 */
export function OrdersOrderView({ groups }: OrdersOrderViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div
          key={group.orderNumber || "unknown"}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900">{group.orderNumber}</span>
              <span className="text-sm text-slate-600">{group.customerName}</span>
              <span className="text-xs text-slate-500">受注日: {group.orderDate}</span>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                group.status === "allocated"
                  ? "bg-blue-100 text-blue-800"
                  : group.status === "shipped"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {group.status}
            </span>
          </div>
          <div className="p-0">
            <DataTable
              data={group.lines}
              columns={orderLineColumns}
              isLoading={false}
              emptyMessage="明細がありません"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
