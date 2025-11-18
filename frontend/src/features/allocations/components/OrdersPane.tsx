/**
 * OrdersPane - 受注一覧ペイン（3カラムレイアウトの左カラム）
 *
 * 機能:
 * - 受注カード一覧表示
 * - 選択中の受注をハイライト表示（背景色＋ボーダー）
 * - クリック時のアニメーション
 * - ローディング＆エラー表示
 */

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/shared/utils/date";
import { cn } from "@/shared/libs/utils";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

interface OrdersPaneProps {
  orders: OrderWithLinesResponse[];
  selectedOrderId: number | null;
  onSelectOrder: (orderId: number) => void;
  isLoading?: boolean;
  error?: Error | null;
}

export function OrdersPane({
  orders,
  selectedOrderId,
  onSelectOrder,
  isLoading = false,
  error = null,
}: OrdersPaneProps) {
  // ステータスバッジのバリアント
  const getStatusBadgeVariant = (status?: string | null) => {
    switch (status) {
      case "open":
      case "draft":
        return "secondary";
      case "allocated":
      case "part_allocated":
        return "default";
      case "shipped":
      case "closed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // ステータス表示名
  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case "draft":
        return "下書き";
      case "open":
        return "未処理";
      case "part_allocated":
        return "一部引当";
      case "allocated":
        return "引当済";
      case "shipped":
        return "出荷済";
      case "closed":
        return "完了";
      case "cancelled":
        return "キャンセル";
      default:
        return status || "不明";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 overflow-y-auto border-r bg-gray-50 p-4">
        <div className="text-center text-sm text-gray-500">受注一覧を読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 overflow-y-auto border-r bg-gray-50 p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-semibold text-red-800">受注一覧の取得に失敗</p>
          <p className="mt-1 text-xs text-red-600">
            {error instanceof Error ? error.message : "サーバーエラー"}
          </p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-3 overflow-y-auto border-r bg-gray-50 p-4">
        <div className="text-center text-sm text-gray-500">受注がありません</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto border-r bg-gray-50 p-4">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-900">受注一覧</h2>
        <p className="text-xs text-gray-500">{orders.length}件</p>
      </div>

      {orders.map((order) => {
        const isSelected = order.id === selectedOrderId;
        const orderNumber = order.order_number || order.order_no || `#${order.id}`;

        return (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelectOrder(order.id!)}
            className={cn(
              "group relative w-full rounded-lg border bg-white p-4 text-left shadow-sm",
              "transition-all duration-150 ease-in-out",
              "hover:border-blue-300 hover:shadow-md",
              isSelected
                ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500 ring-offset-1"
                : "border-gray-200",
            )}
          >
            {/* 受注番号 */}
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{orderNumber}</h3>
              <Badge variant={getStatusBadgeVariant(order.status)}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>

            {/* 顧客情報 */}
            {(order.customer_code || order.customer_name) && (
              <div className="mb-2 text-xs text-gray-600">
                <span className="font-medium">
                  {order.customer_code ? `${order.customer_code}` : ""}
                </span>
                {order.customer_name && (
                  <span className="ml-1">/ {order.customer_name}</span>
                )}
              </div>
            )}

            {/* 納期 */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>納期</span>
              <span className="font-medium text-gray-700">
                {formatDate(order.due_date, { fallback: "未設定" })}
              </span>
            </div>

            {/* 明細数 */}
            {order.lines && order.lines.length > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>明細</span>
                <span className="font-medium text-gray-700">{order.lines.length}行</span>
              </div>
            )}

            {/* 選択インジケーター */}
            {isSelected && (
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-blue-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
