import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatCodeAndName } from "@/lib/utils";

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRematching, setIsRematching] = useState(false);

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(Number(orderId)),
    enabled: !!orderId,
  });

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
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
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
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">基本情報</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem label="受注番号" value={order.order_no} />
          <InfoItem
            label="得意先"
            value={formatCodeAndName(
              order.customer_code,
              (order as { customer_name?: string | null }).customer_name,
            )}
          />
          <InfoItem
            label="受注日"
            value={order.order_date ? format(new Date(order.order_date), "yyyy-MM-dd") : "-"}
          />
          <InfoItem
            label="納期"
            value={order.due_date ? format(new Date(order.due_date), "yyyy-MM-dd") : "-"}
          />
          <InfoItem label="ステータス" value={<StatusBadge status={order.status} />} />
          <InfoItem label="備考" value={order.remarks || "-"} />
        </div>
      </div>

      {/* 明細テーブル */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">受注明細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
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
                <tr key={line.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 text-sm">{line.line_no}</td>
                  <td className="p-3 text-sm font-medium">{line.product_code}</td>
                  <td className="p-3 text-right text-sm">{line.quantity.toLocaleString()}</td>
                  <td className="p-3 text-sm">{line.unit}</td>
                  <td className="p-3 text-sm">
                    {line.due_date ? format(new Date(line.due_date), "yyyy-MM-dd") : "-"}
                  </td>
                  <td className="p-3 text-right text-sm">{line.allocated_qty?.toLocaleString() ?? "-"}</td>
                  <td className="p-3">
                    {/* <ForecastMatchBadge status={line.forecast_match_status} /> */}
                    <span className="text-sm text-gray-500">-</span>
                  </td>
                  <td className="p-3 text-right text-sm">
                    {line.forecast_qty !== null && line.forecast_qty !== undefined ? line.forecast_qty.toLocaleString() : "-"}
                  </td>
                  <td className="p-3 text-sm">
                    {line.forecast_version_no ? (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {line.forecast_version_no}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
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
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; class: string }> = {
    open: { label: "未処理", class: "bg-yellow-100 text-yellow-800" },
    allocated: { label: "引当済", class: "bg-blue-100 text-blue-800" },
    shipped: { label: "出荷済", class: "bg-green-100 text-green-800" },
    completed: { label: "完了", class: "bg-gray-100 text-gray-800" },
  };

  const variant = variants[status] || { label: status, class: "bg-gray-100 text-gray-800" };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${variant.class}`}
    >
      {variant.label}
    </span>
  );
}

// TODO: forecast_match_status が OrderLine 型に追加されたら、ForecastMatchBadge を復活させる

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
