import type { CandidateLotItem } from "../../api";

import { LotListCard } from "./LotListCard";

import { cn } from "@/shared/libs/utils";

interface LotAllocationListProps {
  candidateLots: CandidateLotItem[];
  lotAllocations: Record<number, number>;
  remainingNeeded: number;
  requiredQty: number;
  isActive: boolean;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
}

/**
 * ロット一覧表示コンポーネント
 * 各ロットカードの表示とインタラクションを管理
 *
 * customerId, deliveryPlaceId, productIdはcurrentLineContextAtomから取得されるため、
 * propsでの受け渡しが不要になった（Phase 2）
 */
export function LotAllocationList({
  candidateLots,
  lotAllocations,
  remainingNeeded,
  requiredQty,
  isActive,
  onLotAllocationChange,
}: LotAllocationListProps) {
  // [全量]ボタン用: 指定ロットに全量を割り当て、他を全てクリア（1つのトランザクションとして）
  const handleFullAllocation = (targetLotId: number, fullQty: number) => {
    // まず、他のロットを全てクリア
    Object.keys(lotAllocations).forEach((lotId) => {
      const id = Number(lotId);
      if (id !== targetLotId && (lotAllocations[id] ?? 0) > 0) {
        onLotAllocationChange(id, 0);
      }
    });
    // 次に、対象ロットに全量を設定
    onLotAllocationChange(targetLotId, fullQty);
  };

  return (
    <div className="flex flex-col gap-1">
      {candidateLots.map((lot, index) => {
        const lotId = lot.lot_id;
        const allocatedQty = lotAllocations[lotId] ?? 0;
        const maxAllocatable = allocatedQty + remainingNeeded;

        return (
          <div
            key={lotId}
            className={cn(
              "group/item relative transition-all duration-200 hover:z-10",
              // Zebra striping: even rows get a light gray background
              index % 2 === 1 ? "bg-gray-50/50" : "bg-white",
            )}
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

            {/* ボーダー色変化のみ（scale と shadow は削除） */}
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
                  requiredQty={requiredQty}
                  rank={index + 1}
                  onAllocationChange={(qty) => onLotAllocationChange(lotId, qty)}
                  onFullAllocation={(qty) => handleFullAllocation(lotId, qty)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
