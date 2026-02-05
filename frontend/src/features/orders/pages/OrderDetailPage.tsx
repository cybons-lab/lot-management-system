import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useOrderLock } from "../hooks/useOrderLock";

import { useAuth } from "@/features/auth/AuthContext";
import * as ordersApi from "@/features/orders/api";
import { AllocationDialog, OrderLinesTable, OrderLockBanner } from "@/features/orders/components";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatOrderCode } from "@/shared/utils/order";

// --- Sub-components ---

function OrderDetailHeader({
  order,
  customerName,
}: {
  order: OrderWithLinesResponse;
  customerName: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        to="/orders"
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        受注一覧に戻る
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {formatOrderCode(order)}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span>{customerName}</span>
            <span>•</span>
            <span>{formatDate(order.order_date)}</span>
          </div>
          {/* OCR取込元ファイル名 */}
          {order.ocr_source_filename && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="font-medium">OCR取込元:</span> {order.ocr_source_filename}
            </div>
          )}
          {/* キャンセル理由（キャンセル時のみ表示） */}
          {order.status === "cancelled" && order.cancel_reason && (
            <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <span className="font-medium">キャンセル理由:</span> {order.cancel_reason}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const id = Number(orderId);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !isNaN(id),
  });

  const { user } = useAuth();

  // 編集ロックの統合
  // ページが表示されている間（かつデータ取得後）ロックを取得
  useOrderLock(id, !!order && !isLoading && !isError);

  const [selectedLine, setSelectedLine] = useState<OrderLine | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !order) {
    return <div className="p-8 text-center text-red-500">受注データの取得に失敗しました。</div>;
  }

  const customerName = order.lines?.[0]?.customer_name || `ID: ${order.customer_id}`;

  return (
    <div className="space-y-6">
      {order && user && <OrderLockBanner order={order} currentUserId={user.id} />}

      <OrderDetailHeader order={order} customerName={customerName} />

      <OrderLinesTable order={order} onSelectLine={setSelectedLine} />

      {/* Allocation Dialog (Shared component) */}
      <AllocationDialog
        line={selectedLine}
        onClose={() => setSelectedLine(null)}
        onSuccess={() => {
          setSelectedLine(null);
          refetch();
        }}
      />
    </div>
  );
}
