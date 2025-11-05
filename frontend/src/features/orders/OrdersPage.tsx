import { useState } from "react";
import { useOrders, useDragAssign } from "@/hooks/useOrders";

export function OrdersPage() {
  const [filters] = useState<Record<string, unknown>>({});
  const { data: orders, isLoading } = useOrders(filters);
  const dragAssign = useDragAssign();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">受注一覧</h1>
      <ul className="space-y-2">
        {orders?.map((o) => (
          <li key={o.id} className="border rounded p-2 flex justify-between">
            <div>
              <div>受注ID: {o.id}</div>
              <div>ステータス: {o.status}</div>
              <div>受注日: {o.order_date}</div>
            </div>
            <button
              className="px-3 py-1 rounded border"
              onClick={() =>
                dragAssign.mutate({
                  order_id: o.id,
                  // 最小限のテスト用。実データに合わせて lot/qty/warehouse を渡す
                  allocations: [{ lot_id: 0, quantity: 0, warehouse_id: 1 }],
                } as any)
              }
            >
              仮ドラッグ割当
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
