// pages/OrderCardPage.tsx

import React from "react";
import OrderFilters from "@/features/orders/components/OrderFilters";
import OrderLineCard from "@/features/orders/components/OrderLineCard";
import LotAllocationPanel from "@/features/orders/components/LotAllocationPanel";
import { useOrdersWithAllocations } from "@/features/orders/hooks/useOrders";
import {
  useCandidateLots,
  useCreateAllocations,
  useCancelAllocations,
  useSaveWarehouseAllocations,
  useReMatchOrder,
} from "@/features/orders/hooks/useAllocations";
import type { OrdersListParams } from "@/types";

const DEFAULT_PARAMS: OrdersListParams = { skip: 0, limit: 50 };
const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function OrderCardPage() {
  const [params, setParams] = React.useState<OrdersListParams>(DEFAULT_PARAMS);
  const { data, isLoading, refetch } = useOrdersWithAllocations();

  const [activeOrderId, setActiveOrderId] = React.useState<number | null>(null); // 再マッチ用（任意）
  const [activeLineId, setActiveLineId] = React.useState<number | null>(null);

  const { data: candidates } = useCandidateLots(activeLineId ?? undefined);
  const createAlloc = useCreateAllocations(activeLineId ?? 0, params);
  const cancelAlloc = useCancelAllocations(activeLineId ?? 0);
  const saveWareAlloc = useSaveWarehouseAllocations(activeLineId ?? 0);
  const reMatchOrder = useReMatchOrder(activeOrderId ?? undefined);

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
    return allLines.filter((ln) => {
      const okC =
        !wantCustomer || norm(ln.customer_code).includes(wantCustomer);
      const okS = !wantStatus || norm(ln.status) === wantStatus;
      return okC && okS;
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
      <div className="grid gap-3">
        {lines.map((ln) => (
          <OrderLineCard
            key={ln.id}
            // このAPIは「行」しか返さないため order は省略
            line={ln}
            onOpenAllocation={() => {
              setActiveOrderId(null); // 行APIなので受注ID不明、必要なければnullで
              setActiveLineId(ln.id);
            }}
            onRematch={() => {
              // 受注単位の再マッチが必要なら、lineに order_id が来るようにAPI側拡張が必要
              // ここでは一旦無効化 or null のまま
              if (activeOrderId != null) reMatchOrder.mutate();
            }}
          />
        ))}
      </div>
      <LotAllocationPanel
        open={activeLineId != null}
        onClose={() => setActiveLineId(null)}
        orderLineId={activeLineId}
        candidates={candidates?.items ?? []}
        onAllocate={(payload) => createAlloc.mutate(payload)}
        onCancelAllocations={(payload) => cancelAlloc.mutate(payload)}
        onSaveWarehouseAllocations={(allocs) => saveWareAlloc.mutate(allocs)}
      />
    </div>
  );
}
