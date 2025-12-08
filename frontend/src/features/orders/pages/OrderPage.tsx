import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui"; // Badgeコンポーネントも必要になります
import { Button } from "@/components/ui";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";
import * as ordersApi from "@/features/orders/api";
import { formatCodeAndName } from "@/shared/libs/utils";
import { formatOrderCode } from "@/shared/utils/order";

export function OrderPage() {
  const {
    data: orders = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getOrders(),
  });

  const getStatusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "open":
        return "destructive";
      case "allocated":
        return "secondary";
      case "shipped":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">受注管理</h2>
          <p className="text-muted-foreground">現在有効な受注の一覧です。</p>
        </div>
        {/* 将来的に受注登録ボタンをここに追加 */}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>受注番号</TableHead>
              <TableHead>得意先</TableHead>
              <TableHead>受注日</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>SAP連携</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-destructive h-24 text-center">
                  データの読み込みに失敗しました。
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  受注データがありません。
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                // Build display codes using available fields
                const orderNo = (order as { order_no?: string }).order_no;
                const customerCode = (order as { customer_code?: string }).customer_code;
                const orderCode = formatOrderCode(order) || orderNo || "-";

                return (
                  <TableRow key={order.id}>
                    {/* Prefer customer_order_no when available, fallback to id */}
                    <TableCell className="font-medium">
                      {orderCode}
                    </TableCell>
                    {/* customer_code is legacy field, not in DDL v2.2 */}
                    <TableCell>{formatCodeAndName(customerCode, undefined)}</TableCell>
                    <TableCell>
                      {order.order_date ? format(parseISO(order.order_date), "yyyy/MM/dd") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusVariant(
                          ((order as Record<string, unknown>).status as string) ?? "unknown",
                        )}
                      >
                        {((order as Record<string, unknown>).status as string) ?? "-"}
                      </Badge>
                    </TableCell>
                    {/* sap_order_id removed in DDL v2.2 */}
                    <TableCell>{"-"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        詳細・引当
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
