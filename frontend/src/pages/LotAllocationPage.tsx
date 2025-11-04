/**
 * LotAllocationPage.tsx
 *
 * 設計書V2に基づく3ペイン構成のロット引当ページ
 *
 * 構成:
 * - 左ペイン: 受注一覧（優先度バー、KPIバッジ付き）
 * - 中央ペイン: 選択した受注の明細一覧
 * - 右ペイン: 候補ロット一覧と倉庫別配分入力
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { formatCodeAndName } from "@/lib/utils";
import {
  getOrders,
  getOrder,
} from "@/features/orders/api";
import type {
  OrderLine,
} from "@/types/orders";
import { useLotsQuery, type Lot as CandidateLot } from "@/hooks/useLotsQuery";
import {
  createAllocations,
  type CreateAllocationPayload,
} from "@/features/allocations/api";

// ===== 型定義 =====
interface Order {
  id: number;
  order_no: string;
  customer_code: string;
  customer_name?: string;
  order_date: string;
  due_date?: string;
  ship_to?: string;
  status: string;
  lines?: OrderLine[];
}

type PriorityLevel = "urgent" | "warning" | "attention" | "allocated" | "inactive";

interface OrderCardData extends Order {
  priority: PriorityLevel;
  unallocatedQty: number;
  daysTodue: number | null;
  hasMissingFields: boolean;
}

// ===== ユーティリティ関数 =====

/**
 * 優先度レベルを計算
 */
function calculatePriority(order: Order): PriorityLevel {
  const lines = order.lines || [];

  // 必須フィールド欠落チェック
  const hasMissingFields = !order.ship_to || lines.some((l) => !l.quantity || l.quantity === 0);

  // 発注待ちステータス
  if (order.status === "PENDING_PROCUREMENT") {
    return "inactive";
  }

  // 完了・出荷済みステータス
  if (order.status === "closed" || order.status === "shipped") {
    return "inactive";
  }

  // 未引当数量の計算（allocated_lotsを使用）
  const unallocatedQty = lines.reduce((sum, line) => {
    const allocated =
      line.allocated_lots?.reduce((a, alloc) => a + (alloc.allocated_qty || 0), 0) || 0;
    return sum + (line.quantity - allocated);
  }, 0);

  // 引当済み（未引当なし）
  if (unallocatedQty <= 0) {
    return "allocated";
  }

  // 納期までの日数を計算
  if (!order.due_date) {
    return "attention"; // 納期未設定の場合は注意レベル
  }

  const dueDate = new Date(order.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const daysTodue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 優先度判定
  if (daysTodue < 0) {
    return "urgent"; // 納期遅延
  } else if (daysTodue <= 1) {
    return "urgent"; // 緊急（D-1以内）
  } else if (daysTodue <= 3) {
    return "warning"; // 要対応（D-3以内）
  } else if (daysTodue <= 7) {
    return "attention"; // 注意（D-7以内）
  }

  return "allocated"; // それ以外
}

/**
 * 受注カードデータを作成
 */
function createOrderCardData(order: Order): OrderCardData {
  const lines = order.lines || [];
  const priority = calculatePriority(order);

  // 未引当数量（allocated_lotsを使用）
  const unallocatedQty = lines.reduce((sum, line) => {
    const allocated =
      line.allocated_lots?.reduce((a, alloc) => a + (alloc.allocated_qty || 0), 0) || 0;
    return sum + (line.quantity - allocated);
  }, 0);

  // 納期までの日数
  let daysTodue: number | null = null;
  if (order.due_date) {
    const dueDate = new Date(order.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    daysTodue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 必須フィールド欠落チェック
  const hasMissingFields = !order.ship_to || lines.some((l) => !l.quantity || l.quantity === 0);

  return {
    ...order,
    priority,
    unallocatedQty,
    daysTodue,
    hasMissingFields,
  };
}

/**
 * 優先度カラーを取得
 */
function getPriorityColor(priority: PriorityLevel): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "warning":
      return "bg-orange-500";
    case "attention":
      return "bg-yellow-500";
    case "allocated":
      return "bg-blue-500";
    case "inactive":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}

/**
 * 優先度バッジテキストカラーを取得
 */
function getBadgeColor(priority: PriorityLevel): string {
  switch (priority) {
    case "urgent":
      return "text-red-700 bg-red-100 border-red-300";
    case "warning":
      return "text-orange-700 bg-orange-100 border-orange-300";
    case "attention":
      return "text-yellow-700 bg-yellow-100 border-yellow-300";
    case "allocated":
      return "text-blue-700 bg-blue-100 border-blue-300";
    case "inactive":
      return "text-gray-700 bg-gray-100 border-gray-300";
    default:
      return "text-gray-700 bg-gray-100 border-gray-300";
  }
}

// ===== メインコンポーネント =====

export default function LotAllocationPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL状態管理
  const selectedOrderId = searchParams.get("selected")
    ? Number(searchParams.get("selected"))
    : null;
  const selectedLineId = searchParams.get("line") ? Number(searchParams.get("line")) : null;

  // 受注一覧を取得
  const ordersQuery = useQuery({
    queryKey: ["orders", { status: "open" }],
    queryFn: () => getOrders({ status: "open" }),
  });

  // 選択された受注の詳細を取得
  const orderDetailQuery = useQuery({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: () => getOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  // 選択された明細行
  const selectedLine = orderDetailQuery.data?.lines?.find((line) => line.id === selectedLineId);

  // ロット候補を取得
  const lotsQuery = useLotsQuery(selectedLine?.product_code);
  const candidateLots: CandidateLot[] = lotsQuery.data ?? [];

  // 倉庫別配分入力の状態
  const [warehouseAllocations, setWarehouseAllocations] = useState<Record<string, number>>({});

  type WarehouseSummary = {
    key: string;
    warehouseId?: number;
    warehouseCode?: string | null;
    warehouseName?: string | null;
    totalStock: number;
  };

  const warehouseSummaries: WarehouseSummary[] = useMemo(() => {
    const map = new Map<string, WarehouseSummary>();
    candidateLots.forEach((lot) => {
      const key = String(lot.warehouse_id ?? lot.warehouse_code ?? lot.id);
      const existing = map.get(key) ?? {
        key,
        warehouseId: lot.warehouse_id ?? undefined,
        warehouseCode: lot.warehouse_code ?? null,
        warehouseName: lot.warehouse_name ?? null,
        totalStock: 0,
      };

      existing.totalStock += lot.current_stock?.current_quantity ?? 0;
      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [candidateLots]);

  useEffect(() => {
    if (warehouseSummaries.length === 0) {
      setWarehouseAllocations({});
      return;
    }

    setWarehouseAllocations((prev) => {
      const next: Record<string, number> = {};
      warehouseSummaries.forEach((warehouse) => {
        next[warehouse.key] = prev[warehouse.key] ?? 0;
      });
      return next;
    });
  }, [warehouseSummaries]);

  const allocationList = useMemo(() => {
    return warehouseSummaries
      .map((warehouse) => ({
        warehouse_id: warehouse.warehouseId ?? null,
        warehouse_code: warehouse.warehouseCode ?? null,
        quantity: Number(warehouseAllocations[warehouse.key] ?? 0),
      }))
      .filter((item) => item.quantity > 0);
  }, [warehouseSummaries, warehouseAllocations]);

  const allocationTotalAll = useMemo(() => {
    return warehouseSummaries.reduce(
      (sum, warehouse) => sum + Number(warehouseAllocations[warehouse.key] ?? 0),
      0
    );
  }, [warehouseSummaries, warehouseAllocations]);

  const createAllocationMutation = useMutation({
    mutationFn: (payload: CreateAllocationPayload) => createAllocations(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      console.log("引当データを保存しました");
    },
  });

  const handleSaveAllocations = () => {
    if (!selectedLineId || !selectedLine?.product_code) return;
    if (allocationList.length === 0) return;

    const payload: CreateAllocationPayload = {
      order_line_id: selectedLineId,
      product_code: selectedLine.product_code,
      allocations: allocationList,
    };

    createAllocationMutation.mutate(payload);
  };

  const canSave = allocationList.length > 0 && !createAllocationMutation.isPending;

  // 受注カードデータを作成
  const orderCards = useMemo(() => {
    if (!ordersQuery.data) return [];

    return ordersQuery.data.map(createOrderCardData).sort((a, b) => {
      // 優先度順
      const priorityOrder: Record<PriorityLevel, number> = {
        urgent: 0,
        warning: 1,
        attention: 2,
        allocated: 3,
        inactive: 4,
      };

      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 納期が近い順
      if (a.daysTodue !== null && b.daysTodue !== null) {
        const dueDiff = a.daysTodue - b.daysTodue;
        if (dueDiff !== 0) return dueDiff;
      }

      // 受注日が新しい順
      return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
    });
  }, [ordersQuery.data]);

  // ハンドラー
  const handleSelectOrder = (orderId: number) => {
    setSearchParams({ selected: String(orderId) });
  };

  const handleSelectLine = (lineId: number) => {
    setSearchParams({ selected: String(selectedOrderId), line: String(lineId) });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左ペイン: 受注一覧 */}
      <div className="w-80 border-r bg-white overflow-y-auto">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">受注一覧</h2>
          <p className="text-xs text-gray-600 mt-1">{orderCards.length}件の受注</p>
        </div>

        <div className="divide-y">
          {ordersQuery.isLoading && (
            <div className="p-4 text-center text-gray-500">読み込み中...</div>
          )}

          {ordersQuery.isError && (
            <div className="p-4 text-center text-red-500">エラーが発生しました</div>
          )}

          {orderCards.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={order.id === selectedOrderId}
              onClick={() => handleSelectOrder(order.id)}
            />
          ))}
        </div>
      </div>

      {/* 中央ペイン: 明細一覧 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedOrderId ? (
          <>
            {/* ヘッダー */}
            <div className="p-4 border-b bg-white">
              <h2 className="text-lg font-semibold">
                受注明細: {orderDetailQuery.data?.order_no || `#${selectedOrderId}`}
              </h2>
              {orderDetailQuery.data && (
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>
                    得意先:{" "}
                    {orderDetailQuery.data.customer_name || orderDetailQuery.data.customer_code}
                  </span>
                  <span>
                    受注日:{" "}
                    {format(new Date(orderDetailQuery.data.order_date), "yyyy/MM/dd", {
                      locale: ja,
                    })}
                  </span>
                  {orderDetailQuery.data.due_date && (
                    <span>
                      納期:{" "}
                      {format(new Date(orderDetailQuery.data.due_date), "yyyy/MM/dd", {
                        locale: ja,
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 明細リスト */}
            <div className="flex-1 overflow-y-auto p-4">
              {orderDetailQuery.isLoading && (
                <div className="text-center text-gray-500 py-8">読み込み中...</div>
              )}

              {orderDetailQuery.isError && (
                <div className="text-center text-red-500 py-8">エラーが発生しました</div>
              )}

              {orderDetailQuery.data?.lines && orderDetailQuery.data.lines.length > 0 && (
                <div className="space-y-2">
                  {orderDetailQuery.data.lines.map((line) => (
                    <OrderLineCard
                      key={line.id}
                      line={line}
                      isSelected={line.id === selectedLineId}
                      onClick={() => handleSelectLine(line.id)}
                    />
                  ))}
                </div>
              )}

              {orderDetailQuery.data?.lines && orderDetailQuery.data.lines.length === 0 && (
                <div className="text-center text-gray-500 py-8">明細がありません</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            左ペインから受注を選択してください
          </div>
        )}
      </div>

      {/* 右ペイン: 候補ロット & 倉庫別配分 */}
      <div className="w-96 border-l bg-white overflow-y-auto">
        {selectedLineId && selectedLine ? (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">候補ロット</h3>
              <p className="text-xs text-gray-500 mt-1">
                製品コード: {selectedLine.product_code}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              {lotsQuery.isLoading ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  候補ロットを読み込み中...
                </div>
              ) : lotsQuery.isError ? (
                <div className="py-6 text-center text-sm text-red-600">
                  候補ロットの取得に失敗しました
                </div>
              ) : candidateLots.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  候補ロットがありません
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 pr-2">ロット番号</th>
                        <th className="py-1 pr-2">倉庫</th>
                        <th className="py-1 pr-2 text-right">在庫数</th>
                        <th className="py-1 pr-2 text-right">賞味期限</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidateLots.map((lot) => (
                        <tr key={lot.id} className="border-t">
                          <td className="py-1 pr-2">
                            {lot.lot_number && lot.lot_number.trim() !== ""
                              ? lot.lot_number
                              : `#${lot.id}`}
                          </td>
                          <td className="py-1 pr-2">
                            {formatCodeAndName(
                              lot.warehouse_code ?? "",
                              lot.warehouse_name ?? undefined
                            ) || "—"}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {(lot.current_stock?.current_quantity ?? 0).toLocaleString()}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {lot.expiry_date
                              ? format(new Date(lot.expiry_date), "yyyy/MM/dd", { locale: ja })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-4">
              <div>
                <h4 className="text-sm font-medium">倉庫別配分</h4>
                <p className="mt-1 text-xs text-gray-500">
                  倉庫ごとの在庫に対して配分数量を入力してください。
                </p>
              </div>

              {warehouseSummaries.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  倉庫情報がありません
                </div>
              ) : (
                <div className="space-y-4">
                  {warehouseSummaries.map((warehouse) => {
                    const currentValue = Number(warehouseAllocations[warehouse.key] ?? 0);
                    const maxQty = Math.max(0, Math.floor(warehouse.totalStock));
                    const warehouseLabel =
                      formatCodeAndName(
                        warehouse.warehouseCode ?? "",
                        warehouse.warehouseName ?? undefined
                      ) || "倉庫";

                    return (
                      <div key={warehouse.key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{warehouseLabel}</span>
                          <span className="text-xs text-gray-500">
                            在庫: {maxQty.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxQty}
                          value={currentValue}
                          onChange={(e) => {
                            const next = Math.min(maxQty, Math.max(0, Number(e.target.value)));
                            setWarehouseAllocations((prev) => ({
                              ...prev,
                              [warehouse.key]: next,
                            }));
                          }}
                          className="w-full"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={maxQty}
                            value={currentValue}
                            onChange={(e) => {
                              const next = Math.min(maxQty, Math.max(0, Number(e.target.value)));
                              setWarehouseAllocations((prev) => ({
                                ...prev,
                                [warehouse.key]: next,
                              }));
                            }}
                            className="w-24 rounded border px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-gray-500">/ {maxQty.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-xs text-gray-600">
                配分合計: <span className="font-semibold">{allocationTotalAll.toLocaleString()}</span>
              </div>

              <button
                className="w-full rounded bg-black py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSaveAllocations}
                disabled={!canSave}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
            中央ペインから明細を選択してください
          </div>
        )}
      </div>
    </div>
  );
}

// ===== サブコンポーネント =====

/**
 * 受注カードコンポーネント
 */
interface OrderCardProps {
  order: OrderCardData;
  isSelected: boolean;
  onClick: () => void;
}

function OrderCard({ order, isSelected, onClick }: OrderCardProps) {
  const priorityColor = getPriorityColor(order.priority);
  const badgeColor = getBadgeColor(order.priority);
  const primaryLine = order.lines?.[0];
  const deliveryDestination = order.ship_to ?? "";
  const quantityText =
    primaryLine?.quantity != null
      ? `${primaryLine.quantity.toLocaleString()}${primaryLine.unit ? ` ${primaryLine.unit}` : ""}`
      : "―";
  const dueDateSource = primaryLine?.due_date ?? order.due_date ?? null;
  const dueDateText = dueDateSource
    ? format(new Date(dueDateSource), "MM/dd", { locale: ja })
    : "―";

  return (
    <div
      className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* 優先度インジケータ */}
        <div className={`w-1 h-16 rounded-full ${priorityColor} flex-shrink-0`} />

        <div className="flex-1 min-w-0">
          {/* 1行目: 受注番号、得意先名 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{order.order_no}</span>
            <span className="text-xs text-gray-600 truncate">
              {order.customer_name || order.customer_code}
            </span>
          </div>

          {/* 2行目: KPIバッジ */}
          <div className="flex flex-wrap gap-1 mb-1">
            {/* 未引当バッジ */}
            {order.unallocatedQty > 0 && (
              <span className={`px-2 py-0.5 text-xs font-medium border rounded ${badgeColor}`}>
                未引当: {order.unallocatedQty}
              </span>
            )}

            {/* 納期残バッジ */}
            {order.daysTodue !== null && (
              <span
                className={`px-2 py-0.5 text-xs font-medium border rounded ${
                  order.daysTodue < 0 ? "text-red-700 bg-red-100 border-red-300" : badgeColor
                }`}
              >
                {order.daysTodue < 0 ? `D+${Math.abs(order.daysTodue)}` : `D-${order.daysTodue}`}
              </span>
            )}

            {/* 必須欠落バッジ */}
            {order.hasMissingFields && (
              <span className="px-2 py-0.5 text-xs font-medium border rounded text-red-700 bg-red-100 border-red-300">
                必須欠落
              </span>
            )}

            {/* 発注待ちバッジ */}
            {order.status === "PENDING_PROCUREMENT" && (
              <span className="px-2 py-0.5 text-xs font-medium border rounded text-purple-700 bg-purple-100 border-purple-300">
                発注待ち
              </span>
            )}
          </div>

          {/* 3行目: 納品先/個数/納期 */}
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div>納品先: {deliveryDestination || "―"}</div>
            <div>個数: {quantityText}</div>
            <div>納期: {dueDateText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 受注明細カードコンポーネント
 */
interface OrderLineCardProps {
  line: OrderLine;
  isSelected: boolean;
  onClick: () => void;
}

function OrderLineCard({ line, isSelected, onClick }: OrderLineCardProps) {
  // 引当済み数量を計算（allocated_lotsまたはallocationsから）
  const allocatedQty = line.allocated_lots
    ? line.allocated_lots.reduce((sum, alloc) => sum + (alloc.allocated_qty || 0), 0)
    : 0;

  const remainingQty = line.quantity - allocatedQty;
  const progress = (allocatedQty / line.quantity) * 100;

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium">{line.product_code}</div>
          {line.product_name && <div className="text-xs text-gray-500">{line.product_name}</div>}
          <div className="text-xs text-gray-400">明細 #{line.line_no}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">
            {allocatedQty.toLocaleString()} / {line.quantity.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{line.unit}</div>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
        <div
          className={`h-2 rounded-full transition-all ${
            progress === 100 ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{progress.toFixed(0)}% 引当済</span>
        {remainingQty > 0 && (
          <span className="text-orange-600 font-medium">残り {remainingQty.toLocaleString()}</span>
        )}
      </div>

      {/* 引当詳細（あれば表示） */}
      {line.allocated_lots && line.allocated_lots.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600">引当数: {line.allocated_lots.length} 件</div>
        </div>
      )}
    </div>
  );
}
