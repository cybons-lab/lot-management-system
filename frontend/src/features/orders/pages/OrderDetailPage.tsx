import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import * as ordersApi from "@/features/orders/api";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import { formatCodeAndName } from "@/shared/libs/utils";
import { OrderStatus, ORDER_STATUS_DISPLAY } from "@/shared/types/aliases";

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRematching, setIsRematching] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getOrder(Number(orderId)),
    enabled: !!orderId,
  });

  const updateStatusMutation = useUpdateOrderStatus(Number(orderId));

  const rematchMutation = useMutation({
    // mutationFn: () => api.reMatchOrder(Number(orderId)),
    onMutate: () => {
      setIsRematching(true);
    },
    onSuccess: () => {
      toast({
        title: "再マッチング完了",
        description: "Forecastとの再マッチングが完了しました",
      });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
    onError: (error: Error) => {
      toast({
        title: "再マッチング失敗",
        description: error.message || "再マッチング処理に失敗しました",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRematching(false);
    },
  });

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateStatusMutation.mutate(newStatus, {
      onSuccess: () => {
        toast({
          title: "ステータス更新完了",
          description: `ステータスを「${ORDER_STATUS_DISPLAY[newStatus].label}」に更新しました`,
        });
        setIsStatusDialogOpen(false);
      },
      onError: (error: Error) => {
        toast({
          title: "ステータス更新失敗",
          description: error.message || "ステータス更新に失敗しました",
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          一覧に戻る
        </Button>
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <p className="text-destructive">受注情報の取得に失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            一覧に戻る
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">受注詳細</h2>
            <p className="text-muted-foreground">{order.order_no}</p>
          </div>
        </div>
        <Button onClick={() => rematchMutation.mutate()} disabled={isRematching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRematching ? "animate-spin" : ""}`} />
          再マッチング
        </Button>
      </div>

      {/* ヘッダ情報 */}
      <div className="bg-card rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">基本情報</h3>
          {isStatusDialogOpen && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ステータスを選択:</span>
              {Object.values(OrderStatus).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={order.status === status ? "default" : "outline"}
                  onClick={() => handleStatusChange(status)}
                  disabled={updateStatusMutation.isPending}
                >
                  {ORDER_STATUS_DISPLAY[status].label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsStatusDialogOpen(false)}
              >
                キャンセル
              </Button>
            </div>
          )}
          {!isStatusDialogOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStatusDialogOpen(true)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              ステータス変更
            </Button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem label="受注番号" value={order.order_no} />
          <InfoItem label="得意先" value={formatCodeAndName(order.customer_code, undefined)} />
          <InfoItem
            label="受注日"
            value={order.order_date ? format(new Date(order.order_date), "yyyy-MM-dd") : "-"}
          />
          <InfoItem label="納期" value={"-"} />
          <InfoItem label="ステータス" value={<OrderStatusBadge status={order.status} />} />
        </div>
      </div>

      {/* 明細テーブル */}
      <div className="bg-card rounded-lg border">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">受注明細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-3 text-left text-sm font-medium">行No</th>
                <th className="p-3 text-left text-sm font-medium">品目コード</th>
                <th className="p-3 text-right text-sm font-medium">数量</th>
                <th className="p-3 text-left text-sm font-medium">単位</th>
                <th className="p-3 text-left text-sm font-medium">納期</th>
                <th className="p-3 text-right text-sm font-medium">引当済</th>
                <th className="p-3 text-left text-sm font-medium">Forecast状態</th>
                <th className="p-3 text-right text-sm font-medium">Forecast数量</th>
                <th className="p-3 text-left text-sm font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {order.lines?.map((line) => (
                <tr key={line.id} className="hover:bg-muted/50 border-b">
                  <td className="p-3 text-sm">{line.line_no}</td>
                  <td className="p-3 text-sm font-medium">{line.product_code}</td>
                  <td className="p-3 text-right text-sm">{line.quantity.toLocaleString()}</td>
                  <td className="p-3 text-sm">{line.unit}</td>
                  <td className="p-3 text-sm">
                    {line.due_date ? format(new Date(line.due_date), "yyyy-MM-dd") : "-"}
                  </td>
                  <td className="p-3 text-right text-sm">
                    {line.allocated_qty?.toLocaleString() ?? "-"}
                  </td>
                  <td className="p-3">
                    {/* <ForecastMatchBadge status={line.forecast_match_status} /> */}
                    <span className="text-sm text-gray-500">-</span>
                  </td>
                  <td className="p-3 text-right text-sm">{"-"}</td>
                  <td className="p-3 text-sm">{"-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

// TODO: forecast_match_status が OrderLine 型に追加されたら、ForecastMatchBadge を復活させる

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-muted h-8 w-64 animate-pulse rounded" />
        <div className="bg-muted h-10 w-32 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-48 animate-pulse rounded-lg" />
      <div className="bg-muted h-96 animate-pulse rounded-lg" />
    </div>
  );
}
