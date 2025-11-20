// LotAllocationPanel.tsx
import type { CandidateLotItem } from "../../api";

import { LotAllocationHeader } from "./LotAllocationHeader";
import { LotListCard } from "./LotListCard";

import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { cn } from "@/shared/libs/utils";

interface LotAllocationPanelProps {
  order?: OrderWithLinesResponse;
  orderLine: OrderLine | null;
  candidateLots: CandidateLotItem[];
  lotAllocations: Record<number, number>;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations?: () => void;

  canSave?: boolean;
  isOverAllocated?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  isSaving?: boolean;
  remainingQty?: number;
  layout?: "inline" | "sidePane";
  customerName?: string;
  productName?: string;

  // ★王道追加: 親から受け取る「アクティブ状態」と「アクティブにするための通知」
  isActive?: boolean;
  onActivate?: () => void;
}

export function LotAllocationPanel({
  order,
  orderLine,
  candidateLots,
  lotAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave = false,
  isLoading = false,
  error = null,
  isSaving = false,
  isOverAllocated = false,
  remainingQty: propRemainingQty,
  customerName: propCustomerName,
  productName: propProductName,

  // デフォルトはfalseにしておく（親が未対応でも壊れないように）
  isActive = false,
  onActivate,
}: LotAllocationPanelProps) {
  // 数量計算
  const requiredQty = orderLine ? Number(orderLine.order_quantity ?? orderLine.quantity ?? 0) : 0;
  const dbAllocated = orderLine
    ? Number(orderLine.allocated_qty ?? orderLine.allocated_quantity ?? 0)
    : 0;
  const uiAllocatedTotal = Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0);
  const totalAllocated = dbAllocated + uiAllocatedTotal;

  const remainingNeeded = Math.max(0, requiredQty - totalAllocated);
  const displayRemaining =
    propRemainingQty !== undefined ? propRemainingQty : requiredQty - totalAllocated;
  const progressPercent = requiredQty > 0 ? Math.min(100, (totalAllocated / requiredQty) * 100) : 0;

  // 状態判定
  const isComplete = displayRemaining === 0 && !isOverAllocated;
  const isOver = displayRemaining < 0 || isOverAllocated;

  // コンテナスタイル設定（王道ロジック）
  const containerClasses = cn(
    "flex flex-col rounded-lg border transition-all duration-300 ease-out",

    // 1. 非アクティブ（かつ未完了・エラーなし）: 薄暗く沈ませる
    !isActive &&
      !isComplete &&
      !isOver &&
      "bg-gray-100/80 border-gray-200 opacity-60 grayscale-[0.3] scale-[0.99]",

    // 2. アクティブ（選択中）: 明るくポップアップさせる
    isActive &&
      !isComplete &&
      !isOver &&
      "bg-white border-blue-300 shadow-xl opacity-100 grayscale-0 scale-[1.005] z-10 ring-1 ring-blue-100",

    // 3. 完了時: 緑枠固定
    isComplete &&
      "bg-white border-green-500 ring-1 ring-green-500 shadow-green-100 opacity-80 hover:opacity-100",

    // 4. エラー時: 赤枠強調
    isOver && "bg-red-50 border-red-300 ring-1 ring-red-300 opacity-100",
  );

  const handleSave = () => {
    if (onSaveAllocations && !isOverAllocated) {
      onSaveAllocations();
    }
  };

  // どこかをクリックしたりフォーカスしたりしたら、親に「俺をアクティブにして！」と伝える
  const handleInteraction = () => {
    if (onActivate) {
      onActivate();
    }
  };

  if (!orderLine) {
    return (
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
          明細を選択してください
        </div>
      </div>
    );
  }

  const customerName =
    propCustomerName || order?.customer_name || orderLine.customer_name || "顧客未設定";
  const deliveryPlaceName =
    orderLine.delivery_place_name ||
    (candidateLots.length > 0 ? candidateLots[0].delivery_place_name : undefined) ||
    "納入先未設定";

  return (
    // 最上位divでクリックとフォーカスを検知
    <div
      className={cn("relative outline-none", isLoading ? "pointer-events-none" : "")}
      onClick={handleInteraction}
      onFocus={handleInteraction} // Tabキーなどで入力欄に入った時も反応するように
      onMouseEnter={handleInteraction}
    >
      {/* パネル本体 */}
      <div className={containerClasses}>
        <div className="overflow-hidden rounded-t-lg">
          <LotAllocationHeader
            order={order}
            orderLine={orderLine}
            customerName={customerName}
            productName={propProductName}
            deliveryPlaceName={deliveryPlaceName}
            requiredQty={requiredQty}
            totalAllocated={totalAllocated}
            remainingQty={displayRemaining}
            progressPercent={progressPercent}
            isOverAllocated={isOverAllocated}
            onAutoAllocate={onAutoAllocate}
            onClearAllocations={onClearAllocations}
            onSaveAllocations={handleSave}
            canSave={canSave}
            isSaving={isSaving}
            isLoading={isLoading}
            hasCandidates={candidateLots.length > 0}
          />
        </div>

        {/* ロット一覧エリア */}
        <div className="flex-1 p-2 transition-colors duration-300">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">候補ロットを読み込み中...</div>
          ) : error ? (
            <div className="bg-red-50 p-4 text-center text-sm text-red-600">
              エラーが発生しました
            </div>
          ) : candidateLots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">候補ロットがありません</div>
          ) : (
            <div className="flex flex-col gap-1">
              {candidateLots.map((lot) => {
                const lotId = lot.lot_id;
                const allocatedQty = lotAllocations[lotId] ?? 0;
                const maxAllocatable = allocatedQty + remainingNeeded;

                return (
                  <div
                    key={lotId}
                    className="group/item relative transition-all duration-200 hover:z-10"
                  >
                    {/* リスト内の非アクティブ行を暗くする処理は、Panelがアクティブな時だけ有効にする */}
                    {isActive && (
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-0 z-20 rounded-lg bg-black/5 transition-opacity duration-300",
                          "opacity-0",
                          "group-focus-within/item:!opacity-0 group-hover/item:!opacity-0",
                          // Panel自体がアクティブなら、リスト全体にホバーした時と同じ挙動
                          "hover:opacity-100",
                        )}
                      />
                    )}

                    {/* ★修正箇所: scale と shadow を削除し、ボーダー色変化のみに変更 */}
                    <div className="px-1 py-1">
                      <div
                        className={cn(
                          "rounded-lg border border-transparent transition-colors duration-200",
                          // ホバー時・フォーカス時に青い枠線を表示（動きはなし）
                          "group-focus-within/item:border-blue-400 group-hover/item:border-blue-400",
                        )}
                      >
                        <LotListCard
                          lot={lot}
                          allocatedQty={allocatedQty}
                          maxAllocatable={maxAllocatable}
                          onAllocationChange={(qty) => onLotAllocationChange(lotId, qty)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
