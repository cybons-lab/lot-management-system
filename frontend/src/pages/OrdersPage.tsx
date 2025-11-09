/**
 * Orders Page
 * 受注一覧・詳細表示ページ
 */

import { useState } from "react";

import { useOrders, useOrderDetail, useDragAssign } from "@/hooks/useOrders";
import type { OrderWithLinesResponse, OrderLine } from "@/types/aliases";

export const OrdersPage = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // 受注一覧の取得
  const { data: orders, isLoading: isLoadingOrders } = useOrders();

  // 受注詳細の取得
  const { data: orderDetail, isLoading: isLoadingDetail } = useOrderDetail(
    selectedOrderId || 0
  );

  // ドラッグ&ドロップ引当
  const { assign: dragAssign, isPending: isAssigning } = useDragAssign();

  // 引当実行ハンドラー
  const handleDragAssign = (lotId: number, orderLineId: number) => {
    if (!selectedOrderId) return;

    const payload = {
      order_line_id: orderLineId,
      lot_id: lotId,
      allocate_qty: 1, // 実際の数量を指定
    };

    dragAssign();
    console.log("引当実行:", payload);
    // TODO: 実際の引当処理を実装
  };

  if (isLoadingOrders) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">受注一覧</h1>

      {/* 受注一覧 */}
      <div className="grid gap-4 mb-8">
        {orders?.map((order) => (
          <div
            key={order.id}
            className="border p-4 rounded cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedOrderId(order.id)}
          >
            <div className="font-semibold">受注ID: {order.id}</div>
            <div className="text-sm text-gray-600">
              受注番号: {order.order_no}
            </div>
          </div>
        ))}
      </div>

      {/* 受注詳細 */}
      {selectedOrderId && (
        <div className="border-t pt-8">
          <h2 className="text-xl font-bold mb-4">受注詳細</h2>

          {isLoadingDetail ? (
            <div>読み込み中...</div>
          ) : orderDetail ? (
            <div>
              <div className="mb-4">
                <div className="font-semibold">受注番号</div>
                <div>{(orderDetail as OrderWithLinesResponse)?.order_no || '-'}</div>
              </div>

              <div className="mb-4">
                <div className="font-semibold">明細行</div>
                <div className="space-y-2">
                  {((orderDetail as OrderWithLinesResponse)?.lines as OrderLine[])?.map((line: OrderLine) => (
                    <div key={line.id} className="border p-3 rounded">
                      <div>明細ID: {line.id}</div>
                      <div>商品コード: {line.product_code}</div>
                      <div>数量: {line.quantity}</div>
                      <button
                        onClick={() => handleDragAssign(1, line.id)}
                        disabled={isAssigning}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isAssigning ? "引当中..." : "引当実行"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>データがありません</div>
          )}
        </div>
      )}
    </div>
  );
};
