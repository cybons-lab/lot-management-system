// frontend/src/features/orders/components/OrderLineCard/index.tsx (改善版)
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Check } from "lucide-react";

import OrderLineHeader from "@/features/orders/components/OrderLineHeader";
import AllocationProgress from "@/features/orders/components/AllocationProgress";
import LotListWithAllocation from "@/features/orders/components/LotListWithAllocation";
import ForecastSection from "@/features/orders/components/ForecastSection";
import InfoRow from "@/components/common/InfoRow";
import { formatCodeAndName } from "@/lib/utils";

import { useOrderLineComputed } from "@/features/orders/hooks/useOrderLineComputed";
import { useAllocationActions } from "@/features/orders/hooks/useAllocationActions";
import { formatYmd } from "@/lib/utils/date";

type Props = {
  order?: any;
  line: any;
  onRematch?: () => void;
};

export function OrderLineCard({ order, line, onRematch }: Props) {
  const c = useOrderLineComputed(line, order);

  // ★ 品番を渡してフィルタリング
  const { candidatesQ, createAlloc, cancelAlloc } = useAllocationActions(
    c.ids.lineId,
    c.productCode,
    c.customerCode,
  );

  const canRematch = !!onRematch && !!c.ids.orderId;

  // トースト表示
  const showToast = (message: { title: string; variant?: "default" | "destructive" }) => {
    console.log("Toast:", message);
  };

  // 引当実行
  const handleAllocate = (lotId: number, qty: number) => {
    if (qty <= 0) {
      showToast({ title: "引当数量を入力してください", variant: "destructive" });
      return;
    }
    createAlloc.mutate(
      { allocations: [{ lot_id: lotId, qty }] },
      {
        onSuccess: () => showToast({ title: "引当完了" }),
        onError: () => showToast({ title: "引当失敗", variant: "destructive" }),
      },
    );
  };

  // 引当取消
  const handleCancelAllocation = (allocationId: number) => {
    cancelAlloc.mutate(
      { allocation_ids: [allocationId] },
      {
        onSuccess: () => showToast({ title: "引当取消完了" }),
        onError: () => showToast({ title: "引当取消失敗", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <OrderLineHeader
        productName={c.productName}
        productCode={c.productCode}
        status={c.status}
        orderDate={formatYmd(c.orderDate) || undefined}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム: 引当進捗 + ロット一覧 */}
          <div className="space-y-4">
            <AllocationProgress
              lineId={c.ids.lineId}
              progressPct={c.progressPct}
              allocatedTotal={c.allocatedTotal}
              totalQty={c.totalQty}
              unit={c.unit}
              remainingQty={c.remainingQty}
            />

            <div className="flex items-center gap-2">
              {canRematch && (
                <Button size="sm" variant="secondary" onClick={onRematch}>
                  <RefreshCcw className="mr-1 h-3 w-3" />
                  ロット再マッチ
                </Button>
              )}
            </div>

            {/* ★ ロット一覧（常時表示） */}
            {candidatesQ.data?.warnings?.length ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                {candidatesQ.data.warnings.map((warning) => (
                  <div key={`${warning.code}-${warning.message}`}>
                    <span className="font-semibold">{warning.code}:</span> {warning.message}
                  </div>
                ))}
              </div>
            ) : null}

            <LotListWithAllocation
              candidates={candidatesQ.data?.items ?? []}
              allocatedLots={line?.allocated_lots ?? []}
              onAllocate={handleAllocate}
              onCancelAllocation={handleCancelAllocation}
              unit={c.unit}
              isLoading={candidatesQ.isLoading}
            />
          </div>

          {/* 右カラム: 受注情報 */}
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-sm font-medium text-sky-700">受注情報</h3>
            </div>

            <InfoRow
              label="製品"
              value={`${c.productCode ?? ""} ${c.productName ?? ""}`}
              highlight
            />
            <InfoRow label="数量" value={`${c.totalQty} ${c.unit}`} />
            <InfoRow label="得意先" value={formatCodeAndName(c.customerCode, c.customerName)} />
            <InfoRow label="受注日" value={formatYmd(c.orderDate) || "—"} />
            <InfoRow label="納期" value={formatYmd(c.dueDate) || "—"} />
            <InfoRow
              label="出荷日(予定)"
              value={formatYmd(c.shipDate ?? c.plannedShipDate) || "—"}
            />

            {/* ★ 配送リードタイム */}
            {c.shippingLeadTime && (
              <InfoRow
                label="配送リードタイム"
                value={c.shippingLeadTime}
                highlight={c.shippingLeadTime.includes("遅延")}
              />
            )}
          </div>
        </div>

        {/* ★ フォーキャスト（全幅表示） */}
        <div className="mt-6">
          <ForecastSection productCode={c.productCode} customerCode={c.customerCode} fullWidth />
        </div>
      </div>
    </div>
  );
}
