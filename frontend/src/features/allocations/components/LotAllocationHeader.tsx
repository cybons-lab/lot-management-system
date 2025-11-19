import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/libs/utils";
import { formatDate } from "@/shared/utils/date";
import type { OrderLine } from "@/shared/types/aliases";

type Order = {
  order_number?: string | null;
};

interface LotAllocationHeaderProps {
  order?: Order;
  orderLine: OrderLine;

  customerName?: string;
  deliveryPlaceName?: string;
  productName?: string;

  requiredQty: number;
  totalAllocated: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations: () => void;
  canSave: boolean;
  isSaving: boolean;
  isLoading: boolean;
  hasCandidates: boolean;
}

export function LotAllocationHeader({
  order,
  orderLine,
  customerName = "顧客未設定",
  deliveryPlaceName = "納入先未設定",
  productName: propProductName,
  requiredQty,
  totalAllocated,
  remainingQty,
  progressPercent,
  isOverAllocated,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave,
  isSaving,
  isLoading,
  hasCandidates,
}: LotAllocationHeaderProps) {
  const orderNumber = order?.order_number || "不明な受注";
  const productCode = orderLine.product_code || "CODE";
  const productName = propProductName || orderLine.product_name || "品名不明";
  const deliveryDate = formatDate(orderLine.delivery_date || orderLine.due_date, {
    fallback: "未設定",
  });

  // 保存完了時の「成功演出」用ステート
  const [justSaved, setJustSaved] = useState(false);
  const prevSavingRef = useRef(isSaving);

  // isSaving が true -> false になった瞬間を検知して「保存完了」フラグを立てる
  useEffect(() => {
    if (prevSavingRef.current && !isSaving) {
      // 保存処理が終わった瞬間
      setJustSaved(true);
      const timer = setTimeout(() => {
        setJustSaved(false);
      }, 2000); // 2秒後に元に戻す
      return () => clearTimeout(timer);
    }
    prevSavingRef.current = isSaving;
  }, [isSaving]);

  // 完了状態（残り0かつ過剰でない）
  const isComplete = remainingQty === 0 && !isOverAllocated;

  return (
    <div className="flex flex-col border-b border-gray-200 bg-white transition-colors duration-300">
      {/* 1. ヘッダー行 (Order + Line 主要情報) */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm text-gray-600 transition-colors duration-300",
          // 完了時は薄い緑、通常は薄いグレー
          isComplete ? "bg-green-50/80" : "bg-gray-50/50",
        )}
      >
        {/* 受注番号 */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{orderNumber}</span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        {/* 顧客名 */}
        <div className="flex items-center gap-1.5">
          <span className="i-lucide-building h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-800">{customerName}</span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        {/* 納入先 */}
        <div className="flex items-center gap-1.5">
          <span className="i-lucide-map-pin h-4 w-4 text-gray-400" />
          <span>{deliveryPlaceName}</span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        {/* 納期 */}
        <div className="flex items-center gap-1.5">
          <span className="i-lucide-calendar h-4 w-4 text-gray-400" />
          <span>
            納期: <span className="font-medium text-gray-900">{deliveryDate}</span>
          </span>
        </div>
      </div>

      {/* 2. 明細行 (集計 + ボタン) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        {/* 左側: 製品情報 & 数量サマリ */}
        <div className="flex items-center gap-8">
          {/* 製品情報 */}
          <div className="min-w-[200px]">
            <div className="text-xs font-bold text-gray-400">{productCode}</div>
            <div className="text-lg font-bold text-gray-900">{productName}</div>
          </div>

          {/* 数量サマリ */}
          <div className="flex items-end gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                必要数量
              </span>
              <div className="text-2xl leading-none font-bold text-gray-900">
                {requiredQty.toLocaleString()}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100" />

            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                引当合計
              </span>
              <div className="text-2xl leading-none font-bold text-blue-600">
                {totalAllocated.toLocaleString()}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100" />

            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                残り
              </span>
              <div
                className={cn(
                  "text-2xl leading-none font-bold",
                  remainingQty > 0
                    ? "text-red-600"
                    : remainingQty < 0
                      ? "text-red-600" // 過剰
                      : "text-green-600", // OK
                )}
              >
                {Math.abs(remainingQty).toLocaleString()}
                {remainingQty < 0 && <span className="ml-1 text-xs text-red-500">(過剰)</span>}
                {remainingQty === 0 && <span className="ml-1 text-xs text-green-600">OK</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 右側: アクションボタン */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onAutoAllocate}
            disabled={isLoading || !hasCandidates || remainingQty <= 0}
            className="h-9"
          >
            自動引当
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClearAllocations}
            disabled={totalAllocated === 0}
            className="h-9 text-gray-500 hover:text-gray-900"
          >
            クリア
          </Button>

          <Button
            type="button"
            onClick={onSaveAllocations}
            disabled={!canSave || isSaving}
            className={cn(
              "ml-2 h-9 min-w-[120px] font-bold shadow-sm transition-all duration-300",
              // 過剰ならグレー
              isOverAllocated && !justSaved && "cursor-not-allowed bg-gray-400",
              // 通常時（保存可能）
              !isOverAllocated && !justSaved && "bg-blue-600 hover:bg-blue-700",
              // 保存完了時（緑色）
              justSaved && "border-green-600 bg-green-600 text-white hover:bg-green-700",
            )}
          >
            {/* ボタンの中身をステータスで切り替え */}
            {isSaving ? (
              <>
                <span className="i-lucide-loader-2 mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : justSaved ? (
              <>
                <span className="i-lucide-check mr-2 h-4 w-4" />
                保存完了！
              </>
            ) : (
              "保存"
            )}
          </Button>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="relative h-1 w-full bg-gray-100">
        <div
          className={cn(
            "absolute top-0 left-0 h-full transition-all duration-500 ease-out",
            remainingQty === 0 ? "bg-green-500" : "bg-blue-500",
            remainingQty < 0 && "bg-red-500", // 過剰時は赤
          )}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>
    </div>
  );
}
