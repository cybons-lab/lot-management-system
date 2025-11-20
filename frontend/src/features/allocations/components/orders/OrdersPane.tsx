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
  customerMap?: Record<string, string>;
  isLoading?: boolean;
  error?: Error | null;
}

export function OrdersPane({
  orders,
  selectedOrderId,
  onSelectOrder,
  customerMap = {},
  isLoading = false,
  error = null,
}: OrdersPaneProps) {
  const getCustomerDisplay = (order: OrderWithLinesResponse) => {
    if (order.customer_code) {
      const name = order.customer_name || customerMap[order.customer_code];
      if (name) return `${order.customer_code} ${name}`;
      return order.customer_code;
    }
    if (order.customer_name) return order.customer_name;

    const firstLine = order.lines?.[0];
    const lineCode = firstLine?.customer_code ?? null;
    const lineName = firstLine?.customer_name ?? null;
    if (lineCode) {
      const name = lineName || customerMap[lineCode];
      if (name) return `${lineCode} ${name}`;
      return lineCode;
    }
    if (lineName) return lineName;

    return "未設定";
  };

  const getReceivedDate = (order: OrderWithLinesResponse) => {
    return (
      order.received_at ??
      order.sap_received_at ??
      order.received_date ??
      order.document_date ??
      order.order_date ??
      order.created_at
    );
  };

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
        const lineCount = order.lines?.length ?? 0;
        const lineCountLabel = `${lineCount}行`;
        const customerDisplay = getCustomerDisplay(order);
        const receivedDate = getReceivedDate(order);

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
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{orderNumber}</h3>
                <p className="mt-1 text-xs text-gray-600">
                  得意先: <span className="font-medium text-gray-900">{customerDisplay}</span>
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  受信日:{" "}
                  <span className="font-medium text-gray-900">
                    {formatDate(receivedDate, { fallback: "未設定" })}
                  </span>
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(order.status)}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>納期</span>
              <span className="font-medium text-gray-700">
                {formatDate(order.due_date, { fallback: "未設定" })}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>行数</span>
              <span className="font-semibold text-gray-900">{lineCountLabel}</span>
            </div>

            {isSelected && (
              <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-blue-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
