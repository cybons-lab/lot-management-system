/**
 * LotAllocationPanel - ロット引当パネル（再利用可能）
 *
 * 機能:
 * - ロット候補一覧表示
 * - 各ロットから引当る数量を入力
 * - 「全量」ボタン（残り必要数量を自動入力）
 * - 自動引当（FEFO）ボタン
 * - クリアボタン
 * - 保存ボタン
 * - layout prop により inline / sidePane で見た目調整
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/shared/utils/date";
import { cn } from "@/shared/libs/utils";
import type { CandidateLotItem } from "../api";
import type { OrderLine } from "@/shared/types/aliases";

interface LotAllocationPanelProps {
  /** 選択中の明細行 */
  orderLine: OrderLine | null;
  /** ロット候補一覧 */
  candidateLots: CandidateLotItem[];
  /** ロット引当入力（lotId -> quantity） */
  lotAllocations: Record<number, number>;
  /** ロット引当数量変更ハンドラー */
  onLotAllocationChange: (lotId: number, quantity: number) => void;
  /** 全量ボタンハンドラー（指定ロットで全量にしたい場合） */
  onFillAllFromLot?: (lotId: number) => void;
  /** 自動引当（FEFO）ハンドラー */
  onAutoAllocate: () => void;
  /** クリアハンドラー */
  onClearAllocations: () => void;
  /** 保存ハンドラー */
  onSaveAllocations?: () => void;
  /** 保存可否（外部制御用） */
  canSave?: boolean;
  /** レイアウトモード */
  layout?: "inline" | "sidePane";
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラー */
  error?: Error | null;
  /** 保存中 */
  isSaving?: boolean;
  /** 過剰引当フラグ */
  isOverAllocated?: boolean;
  /** 残り必要数量（負の値は過剰分） */
  remainingQty?: number;
}

export function LotAllocationPanel({
  orderLine,
  candidateLots,
  lotAllocations,
  onLotAllocationChange,
  onFillAllFromLot,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave,
  layout = "sidePane",
  isLoading = false,
  error = null,
  isSaving = false,
  isOverAllocated = false,
  remainingQty: propRemainingQty,
}: LotAllocationPanelProps) {
  // Shake animation state for each lot input
  const [shakingLotId, setShakingLotId] = useState<number | null>(null);

  useEffect(() => {
    if (shakingLotId !== null) {
      const timer = setTimeout(() => setShakingLotId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [shakingLotId]);

  // スタイル調整（inline vs sidePane）
  const containerClasses = cn(
    "flex flex-col bg-white",
    layout === "sidePane" ? "h-full" : "rounded-lg border border-gray-200",
  );

  const headerClasses = cn("border-b bg-white px-4 py-3", layout === "inline" && "rounded-t-lg");

  const contentClasses = cn(
    "flex-1 space-y-4 overflow-y-auto px-4 py-4",
    layout === "inline" && "max-h-[600px]",
  );

  const footerClasses = cn("border-t bg-white px-4 py-3", layout === "inline" && "rounded-b-lg");

  // 必要数量・引当済み・残り
  const requiredQty = orderLine ? Number(orderLine.order_quantity ?? orderLine.quantity ?? 0) : 0;
  const dbAllocated = orderLine
    ? Number(orderLine.allocated_qty ?? orderLine.allocated_quantity ?? 0)
    : 0;
  const uiAllocatedTotal = Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0);
  const totalAllocated = dbAllocated + uiAllocatedTotal;

  // Use prop remainingQty if provided, otherwise calculate locally (though prop is preferred for sync)
  const remainingQty =
    propRemainingQty !== undefined ? propRemainingQty : Math.max(0, requiredQty - totalAllocated);

  const progressPercent = requiredQty > 0 ? Math.min(100, (totalAllocated / requiredQty) * 100) : 0;

  // 保存可能判定
  const autoCanSave = uiAllocatedTotal > 0 && !isSaving && !isOverAllocated;
  const effectiveCanSave = typeof canSave === "boolean" ? canSave : autoCanSave;

  if (!orderLine) {
    return (
      <div className={containerClasses}>
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
          {layout === "inline" ? "明細を選択してください" : "左から明細を選択してください"}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* ヘッダー */}
      <div className={headerClasses}>
        <h3 className="text-sm font-semibold text-gray-900">ロット引当</h3>
        <p className="mt-1 text-xs text-gray-600">
          {orderLine.product_code && (
            <>
              <span className="font-medium">{orderLine.product_code}</span>
              {orderLine.product_name && ` / ${orderLine.product_name}`}
            </>
          )}
        </p>

        {/* サマリ */}
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-500">必要数量</div>
              <div className="mt-1 font-semibold text-gray-900">{requiredQty.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">既引当</div>
              <div className="mt-1 font-semibold text-blue-600">
                {totalAllocated.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500">
                DB: {dbAllocated.toLocaleString()}
                {uiAllocatedTotal > 0 && <> / 入力: {uiAllocatedTotal.toLocaleString()}</>}
              </p>
            </div>
            <div>
              <div className="text-gray-500">残り</div>
              <div
                className={cn(
                  "mt-1 font-semibold",
                  remainingQty > 0
                    ? "text-red-600"
                    : remainingQty < 0
                      ? "text-red-600"
                      : "text-green-600",
                )}
              >
                {Math.abs(remainingQty).toLocaleString()}
                {remainingQty < 0 && <span className="ml-1 text-xs text-red-600">(過剰)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoAllocate}
            disabled={isLoading || candidateLots.length === 0}
            className="flex-1"
          >
            自動引当（FEFO）
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAllocations}
            disabled={uiAllocatedTotal === 0}
          >
            クリア
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSaveAllocations}
            disabled={!effectiveCanSave}
            className={cn(
              "flex-1",
              isOverAllocated ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>

        {isOverAllocated && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">
            <span className="font-bold">警告:</span>{" "}
            必要数量を超えて引当されています。数量を調整してください。
          </div>
        )}

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>引当進捗</span>
            <span className="font-semibold text-gray-700">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* ロット候補一覧 */}
      <div className={contentClasses}>
        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            候補ロットを読み込み中...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-center text-sm font-semibold text-red-800">
              候補ロットの取得に失敗しました
            </p>
            <p className="mt-1 text-center text-xs text-red-600">
              {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
            </p>
          </div>
        ) : candidateLots.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-gray-600">候補ロットがありません</p>
            <p className="mt-1 text-xs text-gray-400">この製品の在庫が存在しません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidateLots.map((lot) => {
              const lotId = lot.lot_id;
              const availableQty = Number(
                lot.free_qty ?? lot.current_quantity ?? lot.available_qty ?? 0,
              );
              const allocatedQty = lotAllocations[lotId] ?? 0;
              const displayAvailableQty = Math.max(0, availableQty - allocatedQty);
              const lotLabel = lot.lot_number ?? `LOT-${lotId}`;

              const warehouseCode = lot.warehouse_code ?? null;
              const warehouseName = lot.warehouse_name ?? null;
              const warehouseDisplay =
                warehouseCode && warehouseName
                  ? `${warehouseCode} / ${warehouseName}`
                  : (warehouseCode ?? warehouseName ?? "-");

              return (
                <div
                  key={lotId}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{lotLabel}</p>
                      <dl className="mt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">倉庫</dt>
                          <dd className="font-medium text-gray-700">{warehouseDisplay}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">期限</dt>
                          <dd className="font-medium text-gray-700">
                            {formatDate(lot.expiry_date, { fallback: "—" })}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="text-right text-xs text-gray-600">
                      <div>在庫数量</div>
                      <div className="mt-1 text-lg font-semibold text-blue-600">
                        {displayAvailableQty.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label
                      className="block text-xs font-medium text-gray-700"
                      htmlFor={`lot-allocation-${lotId}`}
                    >
                      このロットから引当
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id={`lot-allocation-${lotId}`}
                        type="number"
                        min={0}
                        max={availableQty}
                        value={allocatedQty}
                        onChange={(event) => {
                          const inputValue = event.target.value;
                          const parsed = Number(inputValue);

                          // Check if input exceeds available quantity
                          if (parsed > availableQty) {
                            setShakingLotId(lotId);
                          }

                          onLotAllocationChange(lotId, Number.isFinite(parsed) ? parsed : 0);
                        }}
                        className={cn(
                          "flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none",
                          shakingLotId === lotId && "animate-shake border-red-500 ring-red-500",
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onFillAllFromLot) {
                            onFillAllFromLot(lotId);
                            return;
                          }

                          // フォールバック: 既存ロジックで残量に合わせて入力
                          const otherLotsCurrentInput = uiAllocatedTotal - allocatedQty;
                          const dbAllocated = Number(
                            orderLine?.allocated_qty ?? orderLine?.allocated_quantity ?? 0,
                          );
                          const totalOtherAllocation = dbAllocated + otherLotsCurrentInput;
                          // Use local calculation for fallback logic if needed, or rely on parent
                          // Here we just try to fill remaining needed
                          const remainingNeeded = Math.max(0, requiredQty - totalOtherAllocation);
                          const maxAllocation = Math.min(remainingNeeded, availableQty);
                          onLotAllocationChange(lotId, maxAllocation);
                        }}
                        className="whitespace-nowrap"
                      >
                        全量
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onSaveAllocations}
                        disabled={!effectiveCanSave || allocatedQty === 0}
                        className="whitespace-nowrap"
                        title="この状態を保存"
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className={footerClasses}>
        <div className="flex items-center justify-between text-sm text-gray-700">
          <span>配分合計</span>
          <span className={cn("font-semibold", isOverAllocated ? "text-red-600" : "")}>
            {uiAllocatedTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
