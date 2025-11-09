/**
 * LotAllocationPage.tsx
 *
 * 設計書V2に基づく3ペイン構成のロット引当ページ
 *
 * 構成:
 * - 左ペイン: 受注一覧(優先度バー、KPIバッジ付き)
 * - 中央ペイン: 選択した受注の明細一覧
 * - 右ペイン: 候補ロット一覧と倉庫別配分入力
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { createAllocations, type CreateAllocationPayload } from "@/features/allocations/api";
import { getOrders, getOrder } from "@/features/orders/api";
import { useLotsQuery, type Lot as CandidateLot } from "@/hooks/useLotsQuery";
import { formatCodeAndName } from "@/lib/utils";
import type { components } from "@/types/api";
type OrderLine = components["schemas"]["OrderLineOut"];

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

  // 発注待ちステータス
  if (order.status === "PENDING_PROCUREMENT") {
    return "inactive";
  }

  // 完了・出荷済みステータス
  if (order.status === "closed" || order.status === "shipped") {
    return "inactive";
  }

  // 未引当数量の計算(allocated_lotsを使用)
  const unallocatedQty = lines.reduce((sum, line) => {
    const allocated =
      line.allocated_lots?.reduce((a, alloc) => a + (alloc.allocated_qty || 0), 0) || 0;
    return sum + (line.quantity - allocated);
  }, 0);

  // 引当済み(未引当なし)
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
    return "urgent"; // 緊急(D-1以内)
  } else if (daysTodue <= 3) {
    return "warning"; // 要対応(D-3以内)
  } else if (daysTodue <= 7) {
    return "attention"; // 注意(D-7以内)
  }

  return "allocated"; // それ以外
}

/**
 * 受注カードデータを作成
 */
function createOrderCardData(order: Order): OrderCardData {
  const lines = order.lines || [];
  const priority = calculatePriority(order);

  // 未引当数量(allocated_lotsを使用)
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

  // 必須フィールド欠落チェック(緩和版: 明細に製品コードと数量があればOK)
  const hasMissingFields =
    lines.length === 0 || lines.every((l) => !l.product_code || !l.quantity || l.quantity === 0);

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

export function LotAllocationPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderListRef = useRef<HTMLDivElement | null>(null);
  const [_orderListScrollTop, _setOrderListScrollTop] = useState(0);

  // 初回マウント時のフラグ
  const isInitialMount = useRef(true);

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

  // 受注カードデータを作成(フィルタリングとソート)
  const orderCards = useMemo(() => {
    if (!ordersQuery.data) return [];

    return ordersQuery.data
      .map(createOrderCardData)
      .filter((order) => {
        // 明細がある受注のみ表示
        if ((order.lines?.length ?? 0) === 0) return false;
        // 必須欠落は除外
        if (order.hasMissingFields) return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder: Record<PriorityLevel, number> = {
          urgent: 0,
          warning: 1,
          attention: 2,
          allocated: 3,
          inactive: 4,
        };

        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.daysTodue !== null && b.daysTodue !== null) {
          const dueDiff = a.daysTodue - b.daysTodue;
          if (dueDiff !== 0) return dueDiff;
        }

        return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
      });
  }, [ordersQuery.data]);

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
  const [snackbar, setSnackbar] = useState<{
    message: string;
    variant?: "success" | "error";
  } | null>(null);

  // 前回選択された明細IDを保持(useEffect無限ループ防止用)
  const lastSelectedLineIdRef = useRef<number | null>(null);

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
      const key = String(lot.warehouse_code ?? lot.warehouse_id ?? lot.id);
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

  // 倉庫配分の初期化(明細が変わったときのみリセット)
  useEffect(() => {
    if (warehouseSummaries.length === 0) {
      setWarehouseAllocations({});
      lastSelectedLineIdRef.current = selectedLineId ?? null;
      return;
    }

    // 明細が変わった場合のみリセット
    const shouldReset = lastSelectedLineIdRef.current !== (selectedLineId ?? null);

    setWarehouseAllocations((prev) => {
      const next: Record<string, number> = {};
      warehouseSummaries.forEach((warehouse) => {
        next[warehouse.key] = shouldReset ? 0 : (prev[warehouse.key] ?? 0);
      });
      return next;
    });

    lastSelectedLineIdRef.current = selectedLineId ?? null;
  }, [warehouseSummaries, selectedLineId]);

  // スクロール位置の保存
  useEffect(() => {
    const el = orderListRef.current;
    if (!el) return;

    const handleScroll = () => {
      _setOrderListScrollTop(el.scrollTop);
    };

    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Snackbarの自動非表示
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      setSnackbar(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [snackbar]);

  // 配分リスト(保存用)
  const allocationList = useMemo(() => {
    return warehouseSummaries
      .map((warehouse) => ({
        lotId: 0, // TODO: ロット選択機能実装時に適切なlot_idを設定
        lot: null, // TODO: ロット選択機能実装時に適切なlotオブジェクトを設定
        warehouse_id: warehouse.warehouseId ?? null,
        warehouse_code: warehouse.warehouseCode ?? null,
        quantity: Number(warehouseAllocations[warehouse.key] ?? 0),
      }))
      .filter((item) => item.quantity > 0);
  }, [warehouseSummaries, warehouseAllocations]);

  // 配分合計
  const allocationTotalAll = useMemo(() => {
    return warehouseSummaries.reduce(
      (sum, warehouse) => sum + Number(warehouseAllocations[warehouse.key] ?? 0),
      0,
    );
  }, [warehouseSummaries, warehouseAllocations]);

  // 引当保存のMutation
  const createAllocationMutation = useMutation({
    mutationFn: (payload: CreateAllocationPayload) => createAllocations(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSnackbar({ message: "保存しました", variant: "success" });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "保存に失敗しました";
      setSnackbar({ message, variant: "error" });
    },
  });

  const handleSaveAllocations = useCallback(() => {
    if (!selectedLineId || !selectedLine?.product_code) return;
    if (allocationList.length === 0) return;

    const payload: CreateAllocationPayload = {
      order_line_id: selectedLineId,
      product_code: selectedLine.product_code,
      allocations: allocationList,
    };

    createAllocationMutation.mutate(payload);
  }, [selectedLineId, selectedLine, allocationList, createAllocationMutation]);

  const canSave = allocationList.length > 0 && !createAllocationMutation.isPending;

  // 受注一覧から受注を選択したときのハンドラー
  const handleSelectOrder = useCallback(
    (orderId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("selected", String(orderId));
        next.delete("line"); // 明細選択をクリア
        return next;
      });
    },
    [setSearchParams],
  );

  // 明細一覧から明細を選択したときのハンドラー
  const handleSelectLine = useCallback(
    (lineId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (selectedOrderId) {
          next.set("selected", String(selectedOrderId));
        }
        next.set("line", String(lineId));
        return next;
      });
    },
    [setSearchParams, selectedOrderId],
  );

  // 初回マウント時または受注一覧が変更されたときの自動選択
  useEffect(() => {
    // 初回マウント時のみ実行
    if (!isInitialMount.current) return;
    if (orderCards.length === 0) return;

    // 受注が選択されていない場合、最初の受注を選択
    if (!selectedOrderId) {
      isInitialMount.current = false;
      setSearchParams({ selected: String(orderCards[0].id) });
      return;
    }

    // 選択中の受注がリストに存在するかチェック
    const existsInList = orderCards.some((order) => order.id === selectedOrderId);
    if (!existsInList) {
      isInitialMount.current = false;
      setSearchParams({ selected: String(orderCards[0].id) });
    } else {
      isInitialMount.current = false;
    }
  }, [orderCards, selectedOrderId, setSearchParams]);

  // 受注詳細が読み込まれたとき、有効な明細が選択されていない場合は最初の有効な明細を選択
  useEffect(() => {
    if (!orderDetailQuery.data) return;

    const lines = orderDetailQuery.data.lines ?? [];
    if (lines.length === 0) return;

    // 現在選択中の明細が有効かチェック
    const hasSelected = lines.some((line) => line.id === selectedLineId);
    if (!hasSelected) {
      // 有効な明細を選択: 製品コードがあり、数量が0より大きい明細を優先
      const fallbackLine =
        lines.find((line) => line.product_code && line.quantity > 0) ??
        lines.find((line) => !!line.product_code) ??
        lines[0];

      if (!fallbackLine) return;

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("selected", String(orderDetailQuery.data.id));
        next.set("line", String(fallbackLine.id));
        return next;
      });
    }
  }, [orderDetailQuery.data, selectedLineId, setSearchParams]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左ペイン: 受注一覧 */}
      <div className="w-80 border-r bg-white overflow-y-auto" ref={orderListRef}>
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">受注一覧</h2>
          <p className="text-xs text-gray-600 mt-1">{orderCards.length}件の受注</p>
        </div>

        <div className="space-y-2 px-2 py-2">
          {ordersQuery.isLoading && (
            <div className="p-4 text-center text-gray-500">読み込み中...</div>
          )}

          {ordersQuery.isError && (
            <div className="p-4 text-center text-red-500">エラーが発生しました</div>
          )}

          {orderCards.length === 0 && !ordersQuery.isLoading && !ordersQuery.isError && (
            <div className="p-4 text-center text-gray-500">
              表示可能な受注がありません
              <div className="text-xs mt-2 text-gray-400">
                ※製品コードと数量が入力されている明細を持つ受注のみ表示されます
              </div>
            </div>
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
      <div className="flex-[1.35] flex flex-col overflow-hidden">
        {selectedOrderId ? (
          <>
            {/* ヘッダー */}
            <div className="p-4 border-b bg-white">
              <h2 className="text-lg font-semibold">
                受注明細: {orderDetailQuery.data?.order_no || `#${selectedOrderId}`}
              </h2>
              {orderDetailQuery.data && (
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>得意先: {orderDetailQuery.data.customer_code}</span>
                  <span>
                    受注日:{" "}
                    {format(new Date(orderDetailQuery.data.order_date), "yyyy/MM/dd", {
                      locale: ja,
                    })}
                  </span>
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
                      pendingAllocatedQty={line.id === selectedLineId ? allocationTotalAll : 0}
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
      <div className="w-[420px] border-l bg-white overflow-y-auto">
        {selectedLineId && selectedLine ? (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">候補ロット</h3>
              <p className="text-xs text-gray-500 mt-1">製品コード: {selectedLine.product_code}</p>
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
                <div className="py-6 text-center text-sm text-gray-500">候補ロットがありません</div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">ロット番号</th>
                        <th className="px-2 py-1 text-left font-medium">倉庫</th>
                        <th className="px-2 py-1 text-right font-medium">在庫数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidateLots.map((lot) => (
                        <tr key={lot.id} className="border-t">
                          <td className="px-2 py-1">{lot.lot_number}</td>
                          <td className="px-2 py-1 text-gray-600">
                            {lot.warehouse_name || lot.warehouse_code || "―"}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {(lot.current_stock?.current_quantity ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 倉庫別配分入力 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">倉庫別配分</h3>
              {warehouseSummaries.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">配分可能な倉庫がありません</div>
              ) : (
                <div className="space-y-3">
                  {warehouseSummaries.map((warehouse) => {
                    const currentValue = warehouseAllocations[warehouse.key] ?? 0;
                    const warehouseName = formatCodeAndName(
                      warehouse.warehouseCode,
                      warehouse.warehouseName,
                    );

                    return (
                      <div
                        key={warehouse.key}
                        className="rounded-lg border p-3 hover:border-gray-300 transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">{warehouseName}</div>
                          <div className="text-xs text-gray-500">
                            在庫: {warehouse.totalStock.toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={warehouse.totalStock}
                            value={currentValue}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                Math.min(warehouse.totalStock, Number(e.target.value) || 0),
                              );
                              setWarehouseAllocations((prev) => ({
                                ...prev,
                                [warehouse.key]: value,
                              }));
                            }}
                            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            className="rounded bg-gray-100 px-3 py-2 text-xs font-medium hover:bg-gray-200 transition"
                            onClick={() => {
                              const remaining = selectedLine.quantity - allocationTotalAll;
                              const allocatable = Math.min(
                                remaining + currentValue,
                                warehouse.totalStock,
                              );
                              setWarehouseAllocations((prev) => ({
                                ...prev,
                                [warehouse.key]: allocatable,
                              }));
                            }}
                          >
                            最大
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-xs text-gray-600 mt-4">
                配分合計:{" "}
                <span className="font-semibold">{allocationTotalAll.toLocaleString()}</span>
              </div>

              <button
                className="w-full rounded bg-black py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 mt-4"
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

      {/* Snackbar通知 */}
      {snackbar && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm shadow-lg transition-opacity ${
            snackbar.variant === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {snackbar.message}
        </div>
      )}
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
      className={`relative w-full rounded-md border p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-200"
          : "border-transparent hover:bg-gray-50"
      }`}
      onClick={onClick}
      aria-selected={isSelected}
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
  pendingAllocatedQty?: number;
}

function OrderLineCard({ line, isSelected, onClick, pendingAllocatedQty = 0 }: OrderLineCardProps) {
  // 引当済み数量を計算(allocated_lotsまたはallocationsから)
  const allocatedQty = line.allocated_lots
    ? line.allocated_lots.reduce((sum, alloc) => sum + (alloc.allocated_qty || 0), 0)
    : 0;

  const totalQuantity = line.quantity > 0 ? line.quantity : 0;
  const effectivePending = isSelected ? Math.max(0, pendingAllocatedQty) : 0;
  const displayedAllocated = Math.min(totalQuantity, allocatedQty + effectivePending);
  const pendingApplied = Math.max(0, displayedAllocated - allocatedQty);
  const remainingQty = Math.max(0, totalQuantity - displayedAllocated);
  const progress = totalQuantity > 0 ? (displayedAllocated / totalQuantity) * 100 : 0;

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
            {displayedAllocated.toLocaleString()} / {totalQuantity.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{line.unit}</div>
          {pendingApplied > 0 && (
            <div className="text-[11px] text-blue-600">
              確定 {allocatedQty.toLocaleString()} + 配分 {pendingApplied.toLocaleString()}
            </div>
          )}
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

      {/* 引当詳細(あれば表示) */}
      {line.allocated_lots && line.allocated_lots.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600">引当数: {line.allocated_lots.length} 件</div>
        </div>
      )}
    </div>
  );
}
