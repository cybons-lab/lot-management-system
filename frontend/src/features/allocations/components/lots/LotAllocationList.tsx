import type { CandidateLotItem } from "../../api";

import { LotListCard } from "./LotListCard";

import { cn } from "@/shared/libs/utils";

interface LotAllocationListProps {
  candidateLots: CandidateLotItem[];
  lotAllocations: Record<number, number>;
  remainingNeeded: number;
  isActive: boolean;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
}

/**
 * ロット一覧表示コンポーネント
 * 各ロットカードの表示とインタラクションを管理
 */
export function LotAllocationList({
  candidateLots,
  lotAllocations,
  remainingNeeded,
  isActive,
  onLotAllocationChange,
}: LotAllocationListProps) {
  return (
    <div className="flex flex-col gap-1">
      {candidateLots.map((lot) => {
        const lotId = lot.lot_id;
        const allocatedQty = lotAllocations[lotId] ?? 0;
        const maxAllocatable = allocatedQty + remainingNeeded;

        return (
          <div key={lotId} className="group/item relative transition-all duration-200 hover:z-10">
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
                  onAllocationChange={(qty) => onLotAllocationChange(lotId, qty)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
