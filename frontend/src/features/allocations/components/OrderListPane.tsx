/**
 * OrderListPane - Left pane displaying the list of orders
 */

import type { UseQueryResult } from "@tanstack/react-query";
import { forwardRef } from "react";

import type { OrderCardData } from "../types";

import { OrderCard } from "./OrderCard";

interface OrderListPaneProps {
  orderCards: OrderCardData[];
  selectedOrderId: number | null;
  ordersQuery: UseQueryResult<unknown, Error>;
  onSelectOrder: (orderId: number) => void;
}

export const OrderListPane = forwardRef<HTMLDivElement, OrderListPaneProps>(
  ({ orderCards, selectedOrderId, ordersQuery, onSelectOrder }, ref) => {
    return (
      <div className="w-80 overflow-y-auto border-r bg-white" ref={ref}>
        <div className="border-b bg-gray-50 p-4">
          <h2 className="text-lg font-semibold">受注一覧</h2>
          <p className="mt-1 text-xs text-gray-600">{orderCards.length}件の受注</p>
        </div>

        <div className="space-y-2 px-2 py-2">
          {ordersQuery.isLoading && (
            <div className="p-4 text-center text-gray-500">読み込み中...</div>
          )}

          {ordersQuery.isError && (
            <div className="mx-4 my-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-center text-sm font-semibold text-red-800">
                受注データの取得に失敗しました
              </p>
              <p className="mt-1 text-center text-xs text-red-600">
                {ordersQuery.error instanceof Error
                  ? ordersQuery.error.message
                  : "サーバーエラーが発生しました"}
              </p>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => ordersQuery.refetch()}
                  className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  再試行
                </button>
              </div>
            </div>
          )}

          {orderCards.length === 0 && !ordersQuery.isLoading && !ordersQuery.isError && (
            <div className="mx-4 my-2 rounded-lg border border-gray-200 bg-gray-50 p-6">
              <p className="text-center text-sm font-semibold text-gray-700">受注残がありません</p>
              <p className="mt-2 text-center text-xs text-gray-500">
                引当可能な受注が見つかりませんでした。
              </p>
              <p className="mt-1 text-center text-xs text-gray-400">
                ※製品コードと数量が入力されている明細を持つ受注のみ表示されます
              </p>
            </div>
          )}

          {orderCards.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={order.id === selectedOrderId}
              onClick={() => onSelectOrder(order.id)}
            />
          ))}
        </div>
      </div>
    );
  },
);

OrderListPane.displayName = "OrderListPane";
