// frontend/src/features/orders/components/OrderLineCard/index.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, RefreshCcw } from "lucide-react";

import OrderLineHeader from "@/features/orders/components/OrderLineHeader";
import AllocationProgress from "@/features/orders/components/AllocationProgress";
import WarehouseBadges from "@/features/orders/components/WarehouseBadges";
import ForecastSection from "@/features/orders/components/ForecastSection";
import InfoRow from "@/components/common/InfoRow";

import LotAllocationPanel from "@/features/orders/components/LotAllocationPanel";
import { useOrderLineComputed } from "@/features/orders/hooks/useOrderLineComputed";
import { useAllocationActions } from "@/features/orders/hooks/useAllocationActions";

type Props = {
  order?: any;
  line: any;
  /** 旧モーダル用。互換のため残すが未使用 */
  onOpenAllocation?: () => void;
  onRematch?: () => void;
};

function formatYmd(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function OrderLineCard({
  order,
  line,
  onOpenAllocation,
  onRematch,
}: Props) {
  const c = useOrderLineComputed(line, order);
  const { candidatesQ, createAlloc, cancelAlloc, saveWareAlloc } =
    useAllocationActions(c.ids.lineId);

  const canRematch = !!onRematch && !!c.ids.orderId;
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <OrderLineHeader
        productName={c.productName}
        productCode={c.productCode}
        status={c.status}
        orderDate={c.orderDate}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム */}
          <div className="space-y-3">
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onRematch}
                  className="shrink-0">
                  <RefreshCcw className="mr-1 h-3 w-3" />
                  ロット再マッチ
                </Button>
              )}
            </div>

            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing((v) => !v)}>
                {isEditing ? "閉じる" : "ロット編集"}
              </Button>
            </div>

            {isEditing && (
              <div className="mt-3">
                <LotAllocationPanel
                  mode="inline"
                  open
                  onClose={() => setIsEditing(false)}
                  orderLineId={c.ids.lineId ?? null}
                  candidates={candidatesQ.data?.items ?? []}
                  onAllocate={(payload) => createAlloc.mutate(payload)}
                  onCancelAllocations={(payload) => cancelAlloc.mutate(payload)}
                  onSaveWarehouseAllocations={(allocs) =>
                    saveWareAlloc.mutate(allocs)
                  }
                  maxQty={c.totalQty}
                />
              </div>
            )}

            {/* 引当済ロット（既存表示がある場合はここに） */}
            {/* 必要に応じて別コンポーネント化可能 */}
            {Array.isArray(line?.allocated_lots) &&
            line.allocated_lots.length > 0 ? (
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium mb-2">引当済ロット</div>
                <div className="space-y-2">
                  {line.allocated_lots.map((a: any) => (
                    <div
                      key={
                        a?.allocation_id ??
                        `${a?.lot_code}-${a?.warehouse_code}`
                      }
                      className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-mono truncate">{a?.lot_code}</div>
                        <div className="text-xs text-muted-foreground">
                          {a?.allocated_qty} {c.unit} / {a?.warehouse_code}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium mb-2">引当済ロット</div>
                <div className="text-sm text-muted-foreground">
                  まだロットが引当されていません
                </div>
              </div>
            )}
          </div>

          {/* 右カラム */}
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
            <InfoRow label="得意先" value={c.customerCode ?? ""} />
            {c.supplierCode && (
              <InfoRow label="仕入先" value={c.supplierCode} />
            )}
            <InfoRow label="納期" value={formatYmd(c.dueDate) || "—"} />
            <InfoRow
              label="予定出荷日"
              value={formatYmd(c.plannedShipDate) || "—"}
            />

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">出荷倉庫</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-3 w-3" />
                  編集
                </Button>
              </div>
              <WarehouseBadges list={c.warehouseList} unit={c.unit} />
            </div>
          </div>
        </div>

        <ForecastSection productCode={c.productCode} />
      </div>
    </div>
  );
}
