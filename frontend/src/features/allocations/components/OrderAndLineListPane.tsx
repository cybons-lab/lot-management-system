/**
 * OrderAndLineListPane - 左ペイン（受注一覧＋受注明細一覧）
 *
 * 表示内容:
 * - 上部: 受注一覧（クリックで明細を表示）
 * - 下部: 選択中の受注の明細一覧（クリックで右ペインにロット候補表示）
 */

import { useAtom } from "jotai";
import { selectedOrderIdAtom, selectedLineIdAtom } from "../store/atoms";
import type { components } from "@/types/api";

type OrderWithLinesResponse = components["schemas"]["OrderWithLinesResponse"];
type OrderLineResponse = components["schemas"]["OrderLineResponse"];

interface OrderAndLineListPaneProps {
  orders: OrderWithLinesResponse[];
  isLoading: boolean;
  selectedOrderDetail: OrderWithLinesResponse | undefined;
}

export function OrderAndLineListPane({
  orders,
  isLoading,
  selectedOrderDetail,
}: OrderAndLineListPaneProps) {
  const [selectedOrderId, setSelectedOrderId] = useAtom(selectedOrderIdAtom);
  const [selectedLineId, setSelectedLineId] = useAtom(selectedLineIdAtom);

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setSelectedLineId(null); // 受注変更時は明細選択をクリア
  };

  const handleSelectLine = (lineId: number) => {
    setSelectedLineId(lineId);
  };

  if (isLoading) {
    return (
      <div className="w-[480px] border-r bg-white">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[480px] flex-col border-r bg-white">
      {/* 受注一覧 */}
      <div className="flex-1 overflow-y-auto border-b">
        <div className="sticky top-0 z-10 border-b bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">受注一覧</h2>
        </div>
        <div className="space-y-2 p-2">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">受注がありません</div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrderId === order.id}
                onSelect={handleSelectOrder}
              />
            ))
          )}
        </div>
      </div>

      {/* 受注明細一覧 */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">受注明細</h2>
        </div>
        {!selectedOrderId ? (
          <div className="p-8 text-center text-sm text-gray-500">受注を選択してください</div>
        ) : !selectedOrderDetail ? (
          <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
        ) : (
          <div className="space-y-2 p-2">
            {(selectedOrderDetail.lines ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">明細がありません</div>
            ) : (
              (selectedOrderDetail.lines ?? []).map((line) => (
                <OrderLineCard
                  key={line.id}
                  line={line}
                  isSelected={selectedLineId === line.id}
                  onSelect={handleSelectLine}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * OrderCard - 受注カード
 */
interface OrderCardProps {
  order: OrderWithLinesResponse;
  isSelected: boolean;
  onSelect: (orderId: number) => void;
}

function OrderCard({ order, isSelected, onSelect }: OrderCardProps) {
  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
      onClick={() => onSelect(order.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{order.order_number}</p>
          <p className="mt-1 text-xs text-gray-600">納期: {order.order_date}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getStatusColor(
                order.status,
              )}`}
            >
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OrderLineCard - 受注明細カード
 */
interface OrderLineCardProps {
  line: OrderLineResponse;
  isSelected: boolean;
  onSelect: (lineId: number) => void;
}

function OrderLineCard({ line, isSelected, onSelect }: OrderLineCardProps) {
  const orderQty = parseFloat(String(line.order_quantity ?? 0));

  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
      onClick={() => onSelect(line.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">製品ID: {line.product_id}</p>
          <p className="mt-1 text-xs text-gray-600">納入日: {line.delivery_date}</p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-500">受注数量:</span>{" "}
              <span className="font-semibold text-gray-900">
                {orderQty.toLocaleString()} {line.unit}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ステータスラベル取得
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "未処理",
    open: "処理中",
    allocated: "引当済み",
    shipped: "出荷済み",
    completed: "完了",
    cancelled: "キャンセル",
  };
  return labels[status] ?? status;
}

/**
 * ステータス色取得
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    open: "bg-blue-100 text-blue-700",
    allocated: "bg-green-100 text-green-700",
    shipped: "bg-purple-100 text-purple-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}
