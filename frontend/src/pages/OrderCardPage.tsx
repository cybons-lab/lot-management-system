// src/pages/OrderCardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LotCandidate, type AllocatedLot } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { WarehouseAllocationModal } from "@/components/WarehouseAllocationModal";
import {
  Package,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Loader2,
} from "lucide-react";
import type { WarehouseAlloc, Warehouse, OrderLineWithAlloc } from "@/types";
import { useToast } from "@/hooks/use-toast";

/* ---------- utils ---------- */
function formatYmd(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function OrderCardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingOrderLine, setEditingOrderLine] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 受注データ取得（倉庫配分/既引当ロット込み）
  const { data: orderData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders-with-allocations", { searchQuery, statusFilter }],
    queryFn: () => api.getOrdersWithAllocations(),
  });
  const orders: OrderLineWithAlloc[] = orderData?.items ?? [];

  // 倉庫マスタ取得
  const { data: warehouseData, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouse-alloc-list"],
    queryFn: () => api.getWarehouseAllocList(),
  });
  const availableWarehouses: Warehouse[] = warehouseData?.items ?? [];

  // 倉庫配分保存
  const saveAllocMutation = useMutation({
    mutationFn: (data: {
      orderLineId: number;
      allocations: WarehouseAlloc[];
    }) => api.saveWarehouseAllocations(data.orderLineId, data.allocations),
    onSuccess: () => {
      toast({
        title: "保存しました",
        description: "倉庫の配分情報を更新しました。",
      });
      queryClient.invalidateQueries({ queryKey: ["orders-with-allocations"] });
    },
    onError: (error: any) => {
      toast({
        title: "保存失敗",
        description: error.message || "サーバーエラー",
        variant: "destructive",
      });
    },
  });

  const handleSaveAllocations = (allocations: WarehouseAlloc[]) => {
    if (!editingOrderLine) return;
    saveAllocMutation.mutate({
      orderLineId: editingOrderLine.id,
      allocations,
    });
    setEditingOrderLine(null);
  };

  if (isLoadingOrders || isLoadingWarehouses) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    // 以前より 1.5 倍くらいの幅（単列）
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      {/* フィルタ */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="製品コード/得意先コードで検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="open">未処理</SelectItem>
            <SelectItem value="allocated">引当済</SelectItem>
            <SelectItem value="shipped">出荷済</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 受注明細カード（単列） */}
      <div className="space-y-4">
        {orders.map((order: OrderLineWithAlloc) => (
          <OrderCard
            key={order.id}
            order={order}
            onEditWarehouse={() => setEditingOrderLine(order)}
          />
        ))}
      </div>

      {/* 倉庫配分モーダル */}
      {editingOrderLine && (
        <WarehouseAllocationModal
          open
          onOpenChange={(open) => !open && setEditingOrderLine(null)}
          orderLine={editingOrderLine}
          warehouses={availableWarehouses}
          onSave={handleSaveAllocations}
        />
      )}
    </div>
  );
}

/* ====== サブコンポーネント群 ====== */

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span
        className={`text-sm ${
          highlight ? "font-semibold text-foreground" : "text-foreground/90"
        }`}>
        {value}
      </span>
    </div>
  );
}

function OrderCard({
  order,
  onEditWarehouse,
}: {
  order: OrderLineWithAlloc;
  onEditWarehouse: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ヘッダーに表示するための進捗（確定ボタンの活性判定に使用）
  const headerAllocated = (order.allocated_lots ?? []).reduce(
    (s, a: any) => s + (a.allocated_qty ?? 0),
    0
  );
  const canConfirm = headerAllocated >= (order.quantity ?? 0);

  const confirmStatusMutation = useMutation({
    mutationFn: () => api.updateOrderLineStatus(order.id, "allocated"),
    onSuccess: () => {
      toast({ title: "確定完了", description: "引当が確定されました" });
      queryClient.invalidateQueries({ queryKey: ["orders-with-allocations"] });
    },
    onError: (e: any) =>
      toast({
        title: "確定失敗",
        description: e.message || "エラーが発生しました",
        variant: "destructive",
      }),
  });

  const statusConfig = {
    open: { color: "bg-sky-500", label: "未処理", icon: AlertTriangle },
    allocated: { color: "bg-emerald-500", label: "引当済", icon: CheckCircle2 },
    shipped: { color: "bg-amber-500", label: "出荷済", icon: Package },
    completed: { color: "bg-gray-500", label: "完了", icon: CheckCircle2 },
  } as const;
  const statusKey = (order.status || "open") as keyof typeof statusConfig;
  const status = statusConfig[statusKey] || statusConfig.open;
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      {/* ヘッダー（未処理の横に「確定して次へ」） */}
      <div
        className={`flex items-center justify-between border-b p-4 ${status.color} bg-opacity-10`}>
        <div className="flex items-center gap-3">
          <StatusIcon
            className={`h-5 w-5 ${status.color.replace("bg-", "text-")}`}
          />
          <span className="font-semibold">{status.label}</span>

          {statusKey === "open" && (
            <Button
              size="sm"
              variant="secondary"
              className="ml-2"
              disabled={confirmStatusMutation.isPending || !canConfirm}
              onClick={() => {
                if (!canConfirm) {
                  toast({
                    title: "引当が不足しています",
                    description: `必要 ${order.quantity}${order.unit} に対し、現在 ${headerAllocated}${order.unit} です。`,
                    variant: "destructive",
                  });
                  return;
                }
                confirmStatusMutation.mutate();
              }}>
              {confirmStatusMutation.isPending ? "確定中…" : "確定して次へ"}
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          受注日:{" "}
          <span className="font-medium text-foreground">
            {formatYmd(order.order_date)}
          </span>
        </div>
      </div>

      {/* 本文（内部は2列＋下段に横長フォーキャスト） */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左: 情報 */}
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-sm font-medium text-sky-700">受注情報</h3>
            </div>

            <InfoRow
              label="製品"
              value={`${order.product_code} ${order.product_name ?? ""}`}
              highlight
            />
            <InfoRow label="数量" value={`${order.quantity} ${order.unit}`} />
            <InfoRow label="得意先" value={order.customer_code ?? ""} />
            {order.supplier_code && (
              <InfoRow label="仕入先" value={order.supplier_code} />
            )}

            {/* 倉庫配分 */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">出荷倉庫</span>
                <Button variant="outline" size="sm" onClick={onEditWarehouse}>
                  <Edit className="mr-2 h-3 w-3" />
                  編集
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.warehouse_allocations?.length ? (
                  order.warehouse_allocations.map(
                    (a: WarehouseAlloc, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {a.warehouse_code}: {a.quantity} {order.unit}
                      </Badge>
                    )
                  )
                ) : (
                  <span className="text-sm text-muted-foreground">未設定</span>
                )}
              </div>
            </div>
          </div>

          {/* 右: ロット引当 */}
          <div>
            <div className="border-b pb-3 mb-4">
              <h3 className="text-sm font-medium text-emerald-700">
                ロット引当処理
              </h3>
            </div>
            <LotAllocationPanel
              orderLineId={order.id}
              productCode={order.product_code}
              totalQuantity={order.quantity}
              unit={order.unit}
              allocatedLots={order.allocated_lots || []}
              status={order.status}
            />
          </div>

          {/* 下段・横長: フォーキャスト（プレースホルダ） */}
          <div className="lg:col-span-2">
            <div className="border-b pb-3 mb-4">
              <h3 className="text-sm font-medium text-violet-700">
                フォーキャスト
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">
              将来的に製品別の見込み数量を表示（API結線予定）
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LotAllocationPanel({
  orderLineId,
  productCode,
  totalQuantity,
  unit,
  allocatedLots,
  status,
}: {
  orderLineId: number;
  productCode: string;
  totalQuantity: number;
  unit: string;
  allocatedLots: AllocatedLot[];
  status?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 候補ロット
  const { data: candidateData, isLoading } = useQuery({
    queryKey: ["candidate-lots", orderLineId],
    queryFn: () => api.getCandidateLots(orderLineId),
  });
  const candidates: LotCandidate[] = candidateData?.items ?? [];

  // ローカル入力（lot_id -> qty）
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});

  // 既引当合計と残量
  const allocatedTotal = useMemo(
    () => (allocatedLots ?? []).reduce((s, a) => s + (a.allocated_qty ?? 0), 0),
    [allocatedLots]
  );
  const remainingQty = Math.max(0, totalQuantity - allocatedTotal);
  const progressPct = Math.min(
    100,
    (allocatedTotal / Math.max(1, totalQuantity)) * 100
  );

  // FIFOプレフィル（expiry_date 古い順で受注残を満たすまで自動セット）
  useEffect(() => {
    if (!candidates.length) return;
    if (Object.values(qtyMap).some((v) => v > 0)) return; // 手入力尊重

    const fifo = [...candidates].sort((a, b) => {
      const ax = a.expiry_date
        ? new Date(a.expiry_date).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bx = b.expiry_date
        ? new Date(b.expiry_date).getTime()
        : Number.MAX_SAFE_INTEGER;
      return ax - bx;
    });

    let need = remainingQty;
    const next: Record<number, number> = {};
    for (const lot of fifo) {
      if (need <= 0) break;
      const take = Math.min(lot.available_qty, need);
      if (take > 0) {
        next[lot.lot_id] = take;
        need -= take;
      }
    }
    setQtyMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, remainingQty]);

  // 引当（複数・1行専用どちらも使える）
  const allocateMutation = useMutation({
    mutationFn: (allocs: Array<{ lot_id: number; qty: number }>) =>
      api.createLotAllocations(orderLineId, { allocations: allocs }),
    onSuccess: () => {
      toast({ title: "引当完了", description: "ロットの引当が完了しました" });
      queryClient.invalidateQueries({ queryKey: ["orders-with-allocations"] });
      queryClient.invalidateQueries({
        queryKey: ["candidate-lots", orderLineId],
      });
      // qtyMap は保持（連続操作の利便性重視）
    },
    onError: (e: any) =>
      toast({
        title: "引当失敗",
        description: e.message || "エラーが発生しました",
        variant: "destructive",
      }),
  });

  // 取消
  const cancelMutation = useMutation({
    mutationFn: (payload: { allocation_id?: number; all?: boolean }) =>
      api.cancelLotAllocations(orderLineId, payload),
    onSuccess: () => {
      toast({ title: "取消完了", description: "引当を取消しました" });
      queryClient.invalidateQueries({ queryKey: ["orders-with-allocations"] });
      queryClient.invalidateQueries({
        queryKey: ["candidate-lots", orderLineId],
      });
    },
    onError: (e: any) =>
      toast({
        title: "取消失敗",
        description: e.message || "エラーが発生しました",
        variant: "destructive",
      }),
  });

  // プログレス色を割当状況で変更
  const progressClass =
    allocatedTotal > totalQuantity
      ? "[&>div]:bg-red-500"
      : allocatedTotal === totalQuantity
      ? "[&>div]:bg-emerald-500"
      : "[&>div]:bg-sky-500";

  // 単一ロットを「入力値（なければ受注残の範囲で最大）」で引当
  const allocateOne = (lot: LotCandidate) => {
    const desired =
      qtyMap[lot.lot_id] ?? Math.min(lot.available_qty, remainingQty);
    const want = Math.floor(Math.max(0, desired));
    const take = Math.min(want, lot.available_qty, remainingQty);
    if (take <= 0) {
      toast({ title: "これ以上引当できません（受注残：0）" });
      return;
    }
    if (want > take) {
      toast({
        title: "注意",
        description: "受注残または在庫を超えるため、数量を調整して引当します。",
      });
    }
    allocateMutation.mutate([{ lot_id: lot.lot_id, qty: take }]);
  };

  return (
    <div className="space-y-3">
      {/* 進捗メーター（shadcn/ui Progress：色可変） */}
      <div className="rounded-lg border p-3 bg-sky-50/40">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium">引当進捗</span>
          <span className="font-semibold text-foreground">
            {allocatedTotal} / {totalQuantity} {unit}
          </span>
        </div>
        <Progress value={progressPct} className={progressClass} />
        <div className="mt-2 text-xs text-muted-foreground">
          残り {Math.max(0, totalQuantity - allocatedTotal)} {unit}
        </div>
      </div>

      {/* 既引当ロット */}
      {allocatedLots?.length > 0 && (
        <div className="rounded-lg border p-3 bg-emerald-50/30">
          <div className="font-medium text-sm mb-2">引当済み</div>
          <div className="space-y-2">
            {allocatedLots.map((a) => (
              <div
                key={a.allocation_id}
                className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-mono">{a.lot_code}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.allocated_qty} {unit} / {a.warehouse_code}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    cancelMutation.mutate({ allocation_id: a.allocation_id })
                  }>
                  取消
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelMutation.mutate({ all: true })}>
              すべて取消
            </Button>
          </div>
        </div>
      )}

      {/* 候補ロット（数量入力＋各行に「引当」ボタン） */}
      <div className="rounded-lg border p-3 bg-violet-50/20">
        <div className="font-medium text-sm mb-2">
          候補ロット {isLoading ? "(読み込み中…)" : `(${candidates.length}件)`}
        </div>
        <div className="space-y-2 max-h-72 overflow-auto pr-1">
          {candidates.map((lot, idx) => {
            const cur = qtyMap[lot.lot_id] ?? 0;
            return (
              <div
                key={lot.lot_id}
                className={`flex items-center justify-between gap-3 rounded-md p-2 ${
                  idx % 2 === 0 ? "bg-white" : "bg-muted/40"
                }`}>
                <div className="min-w-0">
                  <div className="font-mono truncate text-foreground">
                    {lot.lot_code}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    在庫: {lot.available_qty} {lot.unit} / {lot.warehouse_code}
                  </div>
                  {lot.expiry_date && (
                    <div className="text-xs text-muted-foreground">
                      期限: {lot.expiry_date}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={cur}
                    onChange={(e) => {
                      const raw = Math.floor(Number(e.target.value) || 0);
                      const nonNegative = Math.max(0, raw);
                      const clampedStock = Math.min(
                        nonNegative,
                        lot.available_qty
                      );
                      setQtyMap((m) => ({ ...m, [lot.lot_id]: clampedStock }));
                    }}
                    className="w-24"
                  />
                  <Button size="sm" onClick={() => allocateOne(lot)}>
                    引当
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
