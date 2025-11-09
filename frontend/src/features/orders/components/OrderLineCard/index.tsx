import { RefreshCcw } from "lucide-react";
import * as React from "react";

import { InfoRow } from "@/components/common/InfoRow";
import { Button } from "@/components/ui/button";
import { AllocationProgress } from "@/features/orders/components/AllocationProgress";
import { ForecastSection } from "@/features/orders/components/ForecastSection";
import { LotListWithAllocation } from "@/features/orders/components/LotListWithAllocation";
import * as OrderLineHeader from "@/features/orders/components/OrderLineHeader";
import { useAllocationActions } from "@/features/orders/hooks/useAllocationActions";
import {
  useOrderLineComputed,
  type OrderLineSource,
  type OrderSource,
} from "@/features/orders/hooks/useOrderLineComputed";
import { useToast } from "@/hooks/use-toast";
import { formatCodeAndName } from "@/lib/utils";
import { formatYmd } from "@/lib/utils/date";
import type { AllocatedLot } from "@/types/aliases";

type Props = {
  order?: OrderSource | null;
  line?: OrderLineSource | null;
  onRematch?: () => void;
};

export function OrderLineCard({ order, line, onRematch }: Props) {
  const computed = useOrderLineComputed(line, order ?? undefined);
  const { toast } = useToast();

  const lineId = computed.lineId;
  const { candidatesQ, createAlloc, cancelAlloc } = useAllocationActions(
    lineId,
    computed.productCode,
    computed.customerCode,
  );

  const allocatedLots = React.useMemo<AllocatedLot[]>(() => {
    if (!line || !Array.isArray(line.allocated_lots)) {
      return [];
    }
    return line.allocated_lots.filter(
      (allocation): allocation is AllocatedLot => typeof allocation?.lot_id === "number",
    );
  }, [line]);

  const canRematch = Boolean(onRematch && computed.ids?.orderId);

  const handleAllocate = React.useCallback(
    (lotId: number, qty: number) => {
      if (!lineId) {
        toast({
          title: "引当できません",
          description: "受注明細が選択されていません。",
          variant: "destructive",
        });
        return;
      }

      if (qty <= 0) {
        toast({
          title: "引当数量を入力してください",
          variant: "destructive",
        });
        return;
      }

      createAlloc.mutate(
        { allocations: [{ lot_id: lotId, qty }] },
        {
          onSuccess: () => {
            toast({ title: "引当が完了しました" });
          },
          onError: () => {
            toast({
              title: "引当に失敗しました",
              description: "時間をおいて再度お試しください。",
              variant: "destructive",
            });
          },
        },
      );
    },
    [createAlloc, lineId, toast],
  );

  const handleCancelAllocation = React.useCallback(
    (allocationId: number) => {
      if (!lineId) {
        toast({
          title: "取消できません",
          description: "受注明細が選択されていません。",
          variant: "destructive",
        });
        return;
      }

      cancelAlloc.mutate(
        { allocation_ids: [allocationId] },
        {
          onSuccess: () => {
            toast({ title: "引当を取り消しました" });
          },
          onError: () => {
            toast({
              title: "引当取消に失敗しました",
              description: "ネットワーク状況をご確認ください。",
              variant: "destructive",
            });
          },
        },
      );
    },
    [cancelAlloc, lineId, toast],
  );

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <OrderLineHeader.OrderLineHeader
        productName={computed.productName}
        productCode={computed.productCode}
        status={computed.status}
        orderDate={formatYmd(computed.orderDate) || undefined}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <AllocationProgress
              lineId={lineId}
              progressPct={computed.progressPct ?? 0}
              allocatedTotal={computed.allocatedTotal}
              totalQty={computed.totalQty}
              unit={computed.unit}
              remainingQty={computed.remainingQty}
            />

            <div className="flex items-center gap-2">
              {canRematch && (
                <Button size="sm" variant="secondary" onClick={onRematch}>
                  <RefreshCcw className="mr-1 h-3 w-3" />
                  ロット再マッチ
                </Button>
              )}
            </div>

            {candidatesQ.data?.warnings?.length ? (
              <div className="space-y-1 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                {candidatesQ.data.warnings.map((warning, index) => (
                  <div key={index}>{warning}</div>
                ))}
              </div>
            ) : null}

            <LotListWithAllocation
              candidates={candidatesQ.data?.items ?? []}
              allocatedLots={allocatedLots}
              onAllocate={handleAllocate}
              onCancelAllocation={handleCancelAllocation}
              unit={computed.unit}
              isLoading={candidatesQ.isLoading}
            />
          </div>

          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-sm font-medium text-sky-700">受注情報</h3>
            </div>

            <InfoRow
              label="製品"
              value={`${computed.productCode ?? ""} ${computed.productName ?? ""}`.trim() || "―"}
              highlight
            />
            <InfoRow label="数量" value={`${computed.totalQty} ${computed.unit}`} />
            <InfoRow
              label="得意先"
              value={formatCodeAndName(computed.customerCode, computed.customerName) || "―"}
            />
            <InfoRow label="受注日" value={formatYmd(computed.orderDate) || "―"} />
            <InfoRow label="納期" value={formatYmd(computed.dueDate) || "―"} />
            <InfoRow
              label="出荷日(予定)"
              value={formatYmd(computed.shipDate ?? computed.plannedShipDate) || "―"}
            />

            {computed.shippingLeadTime ? (
              <InfoRow
                label="配送リードタイム"
                value={computed.shippingLeadTime}
                highlight={computed.shippingLeadTime.includes("遅延")}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <ForecastSection
            productCode={computed.productCode}
            customerCode={computed.customerCode}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
}

export default OrderLineCard;
