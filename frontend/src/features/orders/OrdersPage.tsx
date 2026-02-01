import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { useOrdersPageState } from "./hooks/useOrdersPageState";

import { RefreshButton } from "@/components/ui";
import { OrderCard } from "@/features/orders/components/display/OrderCard";
import { OrderFilters } from "@/features/orders/components/filters/OrderFilters";
import { useOrdersList } from "@/features/orders/hooks/useOrders";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import type { OrderWithLinesResponse, OrdersListParams } from "@/shared/types/aliases";

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
  // フィルタ状態（sessionStorageで永続化）
  const { filters, setFilters, resetFilters } = useOrdersPageState();

  const ordersQuery = useOrdersList(filters);
  const orders = React.useMemo(() => normaliseOrders(ordersQuery.data), [ordersQuery.data]);

  const handleSearch = React.useCallback(() => {
    ordersQuery.refetch();
  }, [ordersQuery]);

  const handleReset = React.useCallback(() => {
    resetFilters();
    ordersQuery.refetch();
  }, [ordersQuery, resetFilters]);

  const handleChange = React.useCallback(
    (next: OrdersListParams) => {
      setFilters(next);
    },
    [setFilters],
  );

  React.useEffect(() => {
    if (ordersQuery.error) {
      toast.error("受注の取得に失敗しました");
    }
  }, [ordersQuery.error]);

  return (
    <PageContainer>
      <PageHeader
        title="受注一覧"
        subtitle="受注と引当状況を確認します"
        actions={
          <RefreshButton
            queryKey={["orders", filters]}
            isLoading={ordersQuery.isFetching}
            successMessage="最新の状態を取得しました"
          />
        }
        className="pb-0"
      />

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
    </PageContainer>
  );
}
