// frontend/src/features/orders/components/OrderCard.tsx
import { formatCodeAndName } from "@/shared/libs/utils";
import type { OrderWithLinesResponse } from "@/shared/types/legacy";

type Props = {
  order: OrderWithLinesResponse;
  onSelectLine?: (orderLineId: number) => void;
  onReMatch?: () => void;
};

// eslint-disable-next-line complexity -- Card with conditional rendering for multiple fields
export function OrderCard({ order, onSelectLine, onReMatch }: Props) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">受注ID: #{order.id}</div>
          <div className="text-sm text-gray-500">
            顧客:{" "}
            {formatCodeAndName(
              order.customer_code,
              (order as { customer_name?: string | null }).customer_name,
            )}{" "}
            / 作成日: {order.created_at?.slice(0, 10) ?? "-"}
          </div>
          {/* 業務キー情報 */}
          {(order.lines?.[0]?.customer_order_no || order.lines?.[0]?.sap_order_no) && (
            <div className="mt-1 flex gap-4 text-xs">
              {order.lines?.[0]?.customer_order_no && (
                <span className="text-blue-600">
                  得意先受注No: {order.lines[0].customer_order_no}
                </span>
              )}
              {order.lines?.[0]?.sap_order_no && (
                <span className="text-green-600">SAP: {order.lines[0].sap_order_no}</span>
              )}
            </div>
          )}
        </div>
        {onReMatch && (
          <button className="rounded bg-gray-800 px-3 py-1 text-white" onClick={onReMatch}>
            ロット再マッチ
          </button>
        )}
      </div>

      <div className="mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">行ID</th>
              <th className="py-1">品番</th>
              <th className="py-1">得意先受注No</th>
              <th className="py-1">SAP受注No</th>
              <th className="py-1">数量</th>
              <th className="py-1">ステータス</th>
              <th className="py-1">操作</th>
            </tr>
          </thead>
          <tbody>
            {order.lines?.map((ln) => (
              <tr key={ln.id} className="border-t">
                <td className="py-1">{ln.id}</td>
                <td className="py-1">{ln.product_code}</td>
                <td className="py-1">
                  {ln.customer_order_no || <span className="text-gray-400">–</span>}
                </td>
                <td className="py-1">
                  {ln.sap_order_no || <span className="text-gray-400">–</span>}
                </td>
                <td className="py-1">{ln.quantity}</td>
                <td className="py-1">{ln.status}</td>
                <td className="py-1">
                  {onSelectLine && (
                    <button
                      className="rounded border px-2 py-0.5"
                      onClick={() => onSelectLine(ln.id)}
                    >
                      候補ロット
                    </button>
                  )}
                </td>
              </tr>
            )) ?? null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
