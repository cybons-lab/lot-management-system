import { useState, useEffect } from "react"; // 追加
import { toast } from "sonner"; // 追加

import type { CandidateLotItem } from "../../api";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { formatDate } from "@/shared/utils/date";

interface LotListCardProps {
  lot: CandidateLotItem;
  allocatedQty: number;
  maxAllocatable: number;
  onAllocationChange: (quantity: number) => void;
}

export function LotListCard({
  lot,
  allocatedQty,
  maxAllocatable,
  onAllocationChange,
}: LotListCardProps) {
  // シェイクアニメーション用のステート
  const [isShaking, setIsShaking] = useState(false);

  // シェイクを一定時間で止めるエフェクト
  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const freeQty = Number(lot.free_qty ?? lot.current_quantity ?? 0);
  const remainingInLot = Math.max(0, freeQty - allocatedQty);
  const isExpired = lot.expiry_date ? new Date(lot.expiry_date) < new Date() : false;

  // 入力上限（ロット在庫 または 必要残数 の小さい方）
  // ※maxAllocatable は「現在の入力値 + 残り必要数」なので、これを超えると過剰引当になる
  const limit = Math.min(freeQty, maxAllocatable);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);

    // 空文字の場合は0扱い
    if (value === "") {
      onAllocationChange(0);
      return;
    }

    if (isNaN(numValue)) return;

    // マイナスチェック
    if (numValue < 0) {
      setIsShaking(true);
      toast.error("マイナスの数量は入力できません");
      onAllocationChange(0);
      return;
    }

    // 上限チェック
    // AllocationInputのロジックを移植：上限を超えたら警告を出して上限値に補正
    if (numValue > limit) {
      setIsShaking(true);
      // 状況に応じてメッセージを出し分け
      if (freeQty < maxAllocatable && numValue > freeQty) {
        toast.warning(`在庫数量(${freeQty})を超えています`);
      } else {
        toast.warning(`必要数量を超えています`);
      }

      onAllocationChange(limit);
      return;
    }

    onAllocationChange(numValue);
  };

  const handleFullAllocation = () => {
    onAllocationChange(limit);
  };

  const handleHalfAllocation = () => {
    const half = Math.floor(freeQty / 2);
    const target = Math.min(half, limit);
    onAllocationChange(target);
  };

  const handleClearAllocation = () => {
    onAllocationChange(0);
  };

  return (
    <div className="flex items-center justify-between gap-x-4 bg-white px-4 py-2 text-sm">
      {/* 左側: ロット情報 */}
      <div className="flex min-w-0 flex-grow items-center gap-x-4">
        <div className="min-w-[120px] shrink-0">
          <div className="text-xs font-bold text-gray-400">LOT NO</div>
          <div className="truncate text-sm font-bold text-gray-900" title={lot.lot_number}>
            {lot.lot_number}
          </div>
        </div>

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <div className="min-w-[120px] shrink-0">
          <div className="text-xs font-bold text-gray-400">WAREHOUSE</div>
          <div className="truncate text-sm text-gray-800" title={lot.warehouse_name}>
            {lot.warehouse_name || "倉庫未設定"}
          </div>
          {isExpired && (
            <div className="mt-0.5 flex items-center text-xs font-medium text-red-500">
              <span className="i-lucide-alert-circle mr-1 h-3 w-3" />
              期限切れ
            </div>
          )}
        </div>

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <div className="min-w-[80px] shrink-0 flex-grow">
          <div className="text-xs font-bold text-gray-400">期限</div>
          <div className="text-sm text-gray-800">
            {formatDate(lot.expiry_date, { fallback: "-" })}
          </div>
        </div>
      </div>

      {/* 右側: 数量入力とアクション */}
      <div className="flex shrink-0 items-center gap-x-3">
        <div className="min-w-[120px] text-right">
          <div className="text-xs font-bold text-gray-400">REMAINING / TOTAL</div>
          <div className="text-sm font-bold text-gray-900">
            {remainingInLot.toLocaleString()} / {freeQty.toLocaleString()}
          </div>
        </div>

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <Input
          type="number"
          value={allocatedQty === 0 ? "" : allocatedQty}
          onChange={handleInputChange}
          className={cn(
            "h-8 w-20 text-center text-sm font-bold transition-all",
            // 入力があるときは青枠、シェイク時は赤枠
            allocatedQty > 0
              ? "border-blue-500 text-blue-700 ring-1 ring-blue-500/20"
              : "border-gray-300 text-gray-900",
            isShaking && "animate-shake border-red-500 text-red-600 ring-red-500",
          )}
          placeholder="0"
          min="0"
          // maxはHTML上の入力補助として設定（JS制御も入れているので安心）
          max={limit}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleHalfAllocation}
          disabled={freeQty <= 1}
          className="h-8 px-2 text-xs"
        >
          半量
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFullAllocation}
          disabled={freeQty <= 0}
          className="h-8 px-2 text-xs"
        >
          全量
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClearAllocation}
          disabled={allocatedQty === 0}
          className="h-8 w-8 p-0 text-gray-500 hover:bg-red-50 hover:text-gray-900 hover:text-red-600"
        >
          <span className="i-lucide-x h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
