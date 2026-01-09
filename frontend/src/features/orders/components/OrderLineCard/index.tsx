import { RefreshCcw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { InfoRow } from "@/components/common/InfoRow";
import { Button } from "@/components/ui";
import { AllocationProgress } from "@/features/allocations/components";
import { useAllocationActions } from "@/features/allocations/hooks";
import { ForecastSection, LotListWithAllocation } from "@/features/orders/components";
import * as OrderLineHeader from "@/features/orders/components/display/OrderLineHeader";
import {
  useOrderLineComputed,
  type OrderLineSource,
  type OrderSource,
} from "@/features/orders/hooks/useOrderLineComputed";
import { coerceAllocatedLots } from "@/shared/libs/allocations";
import { formatCodeAndName } from "@/shared/libs/utils";
import type { AllocatedLot, LotCandidateResponse } from "@/shared/types/aliases";
import { formatYmd } from "@/shared/utils/date";

type Props = {
  order?: OrderSource | null;
  line?: OrderLineSource | null;
  onRematch?: () => void;
};

export function OrderLineCard({ order, line, onRematch }: Props) {
  const computed = useOrderLineComputed(line, order ?? undefined);

  const lineId = computed.lineId;
  const { candidatesQ, createAlloc, cancelAlloc } = useAllocationActions(lineId);

  const allocatedLots = React.useMemo<AllocatedLot[]>(
    () => coerceAllocatedLots(line?.allocated_lots),
    [line?.allocated_lots],
  );

  const canRematch = Boolean(onRematch && computed.ids?.orderId);

  // 型ガードでLotCandidateResponseにキャスト
  const candidatesData = candidatesQ.data as LotCandidateResponse | undefined;

  const handleAllocate = React.useCallback(
    (lotId: number, qty: number) => {
      if (!lineId) {
        toast.error("引当できません", { description: "受注明細が選択されていません。" });
        return;
      }

      if (qty <= 0) {
        toast.error("引当数量を入力してください");
        return;
      }

      createAlloc.mutate(
        { allocations: [{ lot_id: lotId, quantity: qty }] },
        {
          onSuccess: () => {
            toast.success("引当が完了しました");
          },
          onError: () => {
            toast.error("引当に失敗しました", { description: "時間をおいて再度お試しください。" });
          },
        },
      );
    },
    [createAlloc, lineId],
  );

  const handleCancelAllocation = React.useCallback(
    (allocationId: number) => {
      if (!lineId) {
        toast.error("取消できません", {
          description: "受注明細が選択されていません。",
        });
        return;
      }

      cancelAlloc.mutate(
        { allocation_ids: [allocationId] },
        {
          onSuccess: () => {
            toast.success("引当を取り消しました");
          },
          onError: () => {
            toast.error("引当取消に失敗しました", {
              description: "ネットワーク状況をご確認ください。",
            });
          },
        },
      );
    },
    [cancelAlloc, lineId],
  );

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <OrderLineHeader.OrderLineHeader
        productName={computed.productName}
        productCode={computed.productCode ?? undefined}
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

            {candidatesData?.warnings && candidatesData.warnings.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                {candidatesData.warnings.map((warning: string, index: number) => (
                  <div key={index}>{warning}</div>
                ))}
              </div>
            ) : null}

            <LotListWithAllocation
              candidates={candidatesData?.items ?? []}
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
              value={`${computed.productCode ?? ""} ${computed.productName ?? ""}`.trim() || "—"}
              highlight
            />
            <InfoRow label="数量" value={`${computed.totalQty} ${computed.unit}`} />
            <InfoRow
              label="得意先"
              value={formatCodeAndName(computed.customerCode, computed.customerName) || "—"}
            />
            <InfoRow label="受注日" value={formatYmd(computed.orderDate) || "—"} />
            <InfoRow label="納期" value={formatYmd(computed.dueDate) || "—"} />
            <InfoRow
              label="出荷日(予定)"
              value={formatYmd(computed.shipDate ?? computed.plannedShipDate) || "—"}
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
            productId={computed.productId ?? undefined}
            customerId={computed.customerId ?? undefined}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
}

export default OrderLineCard;
