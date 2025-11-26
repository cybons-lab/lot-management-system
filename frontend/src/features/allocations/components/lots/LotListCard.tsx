import { AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import type { CandidateLotItem } from "../../api";

import { ForecastTooltip } from "./ForecastTooltip";
import { useForecastData } from "./hooks/useForecastData";

import { Badge, Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface LotListCardProps {
  lot: CandidateLotItem;
  allocatedQty: number;
  maxAllocatable: number;
  requiredQty: number; // 新規: 明細の総要求数
  customerId?: number | null;
  deliveryPlaceId?: number | null;
  productId?: number | null;
  rank: number;
  onAllocationChange: (qty: number) => void;
  onFullAllocation: (qty: number) => void;
}

export function LotListCard({
  lot,
  allocatedQty,
  maxAllocatable,
  requiredQty,
  customerId,
  deliveryPlaceId,
  productId,
  rank,
  onAllocationChange,
  onFullAllocation,
}: LotListCardProps) {
  // シェイクアニメーション用のステート
  const [isShaking, setIsShaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // フォーキャスト表示用のステートとデータ取得
  const [showForecast, setShowForecast] = useState(false);
  const { data: forecasts, isLoading: isForecastLoading } = useForecastData(
    customerId,
    deliveryPlaceId,
    productId,
  );

  // シェイクを一定時間で止めるエフェクト
  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const freeQty = Number(lot.available_quantity ?? 0);
  const remainingInLot = Math.max(0, freeQty - allocatedQty);
  const isExpired = lot.expiry_date ? new Date(lot.expiry_date) < new Date() : false;

  // 入力上限（ロット在庫 または 必要残数 の小さい方）
  const limit = Math.min(freeQty, maxAllocatable);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);

    // 空文字の場合は0扱い
    if (value === "") {
      onAllocationChange(0);
      setIsConfirmed(false); // 入力変更時は未確定に戻す
      return;
    }

    if (isNaN(numValue)) return;

    // マイナスチェック
    if (numValue < 0) {
      setIsShaking(true);
      toast.error("マイナスの数量は入力できません");
      onAllocationChange(0);
      setIsConfirmed(false);
      return;
    }

    // 上限チェック
    if (numValue > limit) {
      setIsShaking(true);
      if (freeQty < maxAllocatable && numValue > freeQty) {
        toast.warning(`在庫数量(${freeQty})を超えています`);
      } else {
        toast.warning(`必要数量を超えています`);
      }
      onAllocationChange(limit);
      setIsConfirmed(false);
      return;
    }

    onAllocationChange(numValue);
    setIsConfirmed(false); // 手動入力時は未確定
  };

  // 全量ボタン: このロットに可能な限り割り当て、他をクリア
  const handleFullAllocation = () => {
    // 割り当てたい総量は「明細の総要求数」
    // ただし、このロットの在庫(freeQty)が上限
    const fillQty = Math.min(freeQty, requiredQty);
    onFullAllocation(fillQty);
    setIsConfirmed(true); // 全量ボタンは自動的に確定
  };

  // [引確] ボタン: 現在の入力を確定
  const handleConfirm = () => {
    if (allocatedQty > 0) {
      setIsConfirmed(true);
      toast.success("引当を確定しました");
    }
  };

  // [×] クリアボタン
  const handleClearAllocation = () => {
    onAllocationChange(0);
    setIsConfirmed(false);
  };

  const isLocked = lot.status === "locked" || lot.status === "quarantine";
  const lockReason = lot.lock_reason || (lot.status === "quarantine" ? "検疫中" : "ロック中");

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-x-4 px-4 py-2 text-sm",
        isLocked ? "bg-gray-100" : "bg-white",
        freeQty <= 0 && "opacity-50",
      )}
    >
      {/* 左側: ロット情報 */}
      <div className="flex min-w-0 flex-grow items-center gap-x-4">
        {/* Rank Badge */}
        {rank && (
          <div className="shrink-0">
            <Badge
              className={cn(
                "hover:bg-opacity-90 h-6 w-8 justify-center rounded px-0 text-xs font-bold",
                rank === 1 && "bg-blue-600 text-white hover:bg-blue-700",
                rank === 2 && "bg-blue-400 text-white hover:bg-blue-500",
                rank === 3 && "bg-blue-300 text-white hover:bg-blue-400",
                rank > 3 && "bg-gray-100 text-gray-500 hover:bg-gray-200",
              )}
            >
              #{rank}
            </Badge>
          </div>
        )}

        <div className="min-w-[120px] shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-gray-400">LOT NO</div>
            {allocatedQty > 0 && (
              <Badge className="h-5 bg-blue-500 px-1.5 text-[11px] font-bold text-white hover:bg-blue-600">
                仮払出
              </Badge>
            )}
            {isLocked && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                <span className="i-lucide-lock h-3 w-3" />
                {lockReason}
              </div>
            )}
          </div>
          <div className="truncate text-base font-bold text-gray-900" title={lot.lot_number}>
            {lot.lot_number}
          </div>
        </div>

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <div className="min-w-[120px] shrink-0">
          <div className="text-xs font-bold text-gray-400">保管倉庫</div>
          <div className="truncate text-sm text-gray-600" title={lot.warehouse_name ?? undefined}>
            {lot.warehouse_name || "未登録"}
          </div>
          {isExpired && freeQty > 0 && (
            <div className="mt-0.5 flex items-center text-xs font-medium text-red-500">
              <span className="i-lucide-alert-circle mr-1 h-3 w-3" />
              期限切れ
            </div>
          )}
        </div>

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <div className="min-w-[80px] shrink-0 flex-grow">
          <div className="text-xs font-bold text-gray-400">有効期限</div>
          <div className="text-sm text-gray-500">
            {formatDate(lot.expiry_date, { fallback: "-" })}
          </div>
        </div>
      </div>

      {/* 右側: 数量入力とアクション */}
      <div className="flex shrink-0 items-center gap-x-3">
        <div className="min-w-[140px] text-right">
          <div className="text-xs font-bold text-gray-400">残量 / 総量</div>
          <div className="text-sm font-bold text-gray-900">
            {formatQuantity(remainingInLot, lot.internal_unit || "PCS")} /{" "}
            {formatQuantity(freeQty, lot.internal_unit || "PCS")} {lot.internal_unit}
          </div>
          {lot.qty_per_internal_unit && lot.external_unit && (
            <div className="text-[10px] text-gray-500">
              (={" "}
              {formatQuantity(
                remainingInLot * lot.qty_per_internal_unit,
                lot.external_unit || "BOX",
              )}{" "}
              / {formatQuantity(freeQty * lot.qty_per_internal_unit, lot.external_unit || "BOX")}{" "}
              {lot.external_unit})
            </div>
          )}
        </div>

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <div className="h-8 w-px shrink-0 bg-gray-100" />

        <div
          className="relative"
          onMouseEnter={() => setShowForecast(true)}
          onMouseLeave={() => setShowForecast(false)}
          onFocus={() => setShowForecast(true)}
          onBlur={() => setShowForecast(false)}
        >
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={allocatedQty === 0 ? "" : allocatedQty}
                onChange={handleInputChange}
                className={cn(
                  "h-8 w-20 text-center text-sm font-bold transition-all",
                  isConfirmed
                    ? "border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
                    : allocatedQty > 0
                      ? "border-orange-500 text-orange-700 ring-1 ring-orange-500/20"
                      : "border-gray-300 text-gray-900",
                  isShaking && "animate-shake border-red-500 text-red-600 ring-red-500",
                )}
                placeholder="0"
                min="0"
                max={limit}
              />
              <span className="text-xs text-gray-500">{lot.internal_unit}</span>
            </div>
            {allocatedQty > 0 && lot.qty_per_internal_unit && lot.external_unit && (
              <div className="absolute right-0 -bottom-4 left-0 text-center text-[10px] text-gray-500">
                ={" "}
                {formatQuantity(
                  allocatedQty * lot.qty_per_internal_unit,
                  lot.external_unit || "BOX",
                )}{" "}
                {lot.external_unit}
              </div>
            )}
          </div>
          <AnimatePresence>
            {showForecast && (
              <ForecastTooltip forecasts={forecasts || []} isLoading={isForecastLoading} />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 rounded-md bg-gray-50 p-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFullAllocation}
            disabled={freeQty <= 0 || isLocked}
            className="h-8 px-2 text-xs"
            title="このロットから全量割当（他のロットはクリア）"
          >
            全量
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleConfirm}
            disabled={allocatedQty === 0 || isConfirmed}
            className={cn(
              "h-8 px-2 text-xs",
              isConfirmed && "border-blue-300 bg-blue-50 text-blue-700",
            )}
          >
            引確
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAllocation}
            disabled={allocatedQty === 0}
            className={cn(
              "h-8 w-8 p-0 text-gray-500 transition-colors",
              "border border-gray-300 bg-white shadow-sm", // デフォルトで見やすく
              "hover:border-red-300 hover:bg-red-50 hover:text-red-600",
              allocatedQty === 0 && "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50",
            )}
            title="クリア"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
