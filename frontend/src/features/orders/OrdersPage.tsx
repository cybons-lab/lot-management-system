import { Loader2, RefreshCcw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { OrderFilters } from "@/features/orders/components/OrderFilters";
import { useOrdersList } from "@/features/orders/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import type { OrderWithLinesResponse, OrdersListParams } from "@/shared/types/aliases";

const DEFAULT_FILTERS: OrdersListParams = { limit: 20, skip: 0 };

function normaliseOrders(data: unknown): OrderWithLinesResponse[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data as OrderWithLinesResponse[];
  }

  if (typeof data === "object") {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items as OrderWithLinesResponse[];
    }

    const records = (data as { data?: unknown }).data;
    if (Array.isArray(records)) {
      return records as OrderWithLinesResponse[];
    }
  }

  return [];
}

export function OrdersPage() {
  const [filters, setFilters] = React.useState<OrdersListParams>(DEFAULT_FILTERS);
  const { toast } = useToast();

  const ordersQuery = useOrdersList(filters);
  const orders = React.useMemo(() => normaliseOrders(ordersQuery.data), [ordersQuery.data]);

  const handleSearch = React.useCallback(() => {
    ordersQuery.refetch();
  }, [ordersQuery]);

  const handleReset = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    ordersQuery.refetch();
  }, [ordersQuery]);

  const handleChange = React.useCallback((next: OrdersListParams) => {
    setFilters(next);
  }, []);

  React.useEffect(() => {
    if (ordersQuery.error) {
      toast({
        title: "受注の取得に失敗しました",
        description: ordersQuery.error instanceof Error ? ordersQuery.error.message : undefined,
        variant: "destructive",
      });
    }
  }, [ordersQuery.error, toast]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">受注一覧</h1>
          <p className="text-muted-foreground text-sm">受注と引当状況を確認します</p>
        </div>
        <Button
          variant="outline"
          onClick={() => ordersQuery.refetch()}
          disabled={ordersQuery.isFetching}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
          最新の状態を取得
        </Button>
      </div>

      <OrderFilters
        value={filters}
        onChange={handleChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <div className="space-y-4">
        {ordersQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> 受注データを読み込み中です
          </div>
        ) : null}

        {!ordersQuery.isLoading && orders.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            条件に一致する受注は見つかりませんでした
          </div>
        ) : null}

        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
}
