// pages/OrderCardPage.tsx

import React from "react";
import OrderFilters from "@/features/orders/components/OrderFilters";
import OrderLineCard from "@/features/orders/components/OrderLineCard";
import { useOrdersWithAllocations } from "@/features/orders/hooks/useOrders";
import type { OrdersListParams } from "@/types";
import { isValidDate } from "@/lib/utils/date";

const DEFAULT_PARAMS: OrdersListParams = {
  skip: 0,
  limit: 50,
  due_filter: "all",
};
const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function OrderCardPage() {
  const [params, setParams] = React.useState<OrdersListParams>(DEFAULT_PARAMS);
  const { data, isLoading, refetch } = useOrdersWithAllocations();

  const handleReset = () => setParams(DEFAULT_PARAMS);
  const handleSearch = () => refetch();

  // ★ API 形: { items: [ <行> ] } または配列本体
  const allLines: any[] = React.useMemo(() => {
    const raw: any = data ?? [];
    return Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
      ? raw.items
      : [];
  }, [data]);

  // ★ フィルタ（顧客コードはゆるい一致）
  const lines = React.useMemo(() => {
    const wantCustomer = norm(params.customer_code);
    const wantStatus = norm(params.status);
    const wantDue = params.due_filter ?? "all";
    return allLines.filter((ln) => {
      const okC =
        !wantCustomer || norm(ln.customer_code).includes(wantCustomer);
      const okS = !wantStatus || norm(ln.status) === wantStatus;
      // 納期候補: due_date（正式）→ ship_date（誤用/流用）→ planned_ship_date（逆算予定）
      const dueSource =
        ln?.due_date ?? ln?.ship_date ?? ln?.planned_ship_date ?? null;
      const hasDue = isValidDate(dueSource);

      const okDue =
        wantDue === "all" ? true : wantDue === "has_due" ? hasDue : !hasDue;
      return okC && okS && okDue;
    });
  }, [allLines, params]);

  return (
    <div className="space-y-4 mx-auto px-3 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
      <OrderFilters
        value={params}
        onChange={setParams}
        onSearch={handleSearch}
        onReset={handleReset}
      />
      {isLoading && (
        <div className="p-3 text-sm text-gray-500">読み込み中…</div>
      )}
      {!isLoading && lines.length === 0 && (
        <div className="p-3 text-sm text-amber-600 border rounded">
          該当する受注明細がありません。フィルタを見直してください
          （顧客コードはハイフン等を無視して検索されます）。
        </div>
      )}
      <div className="flex items-center justify-end text-xs text-muted-foreground">
        {lines.length} / {allLines.length} 件
      </div>
      <div className="grid gap-3">
        {lines.map((ln) => (
          <OrderLineCard
            key={ln.id}
            // このAPIは「行」しか返さないため order は省略
            line={ln}
          />
        ))}
      </div>
    </div>
  );
}
