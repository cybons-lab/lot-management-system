import { orderLineColumns } from "@/features/orders/components/OrderLineColumns";
import type { GroupedOrderLine } from "@/features/orders/utils/groupOrders";
import { DataTable } from "@/shared/components/data/DataTable";

interface OrdersDeliveryViewProps {
  groups: GroupedOrderLine[];
}

/**
 * 納入先単位のグループ表示ビュー
 */
export function OrdersDeliveryView({ groups }: OrdersDeliveryViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div
          key={group.deliveryPlaceCode || "unknown"}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-green-50 to-slate-50 px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900">{group.deliveryPlaceCode}</span>
              <span className="text-sm text-slate-600">{group.deliveryPlaceName}</span>
              <span className="text-xs text-slate-500">明細数: {group.lines.length}</span>
            </div>
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
