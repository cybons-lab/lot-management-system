/**
 * ProductGroupHeader.tsx
 * 製品別グループのヘッダー表示
 */

import { ChevronDown, ChevronRight } from "lucide-react";

import { formatQuantity } from "@/shared/utils/formatQuantity";

interface ProductGroupHeaderProps {
  productCode: string;
  productName: string;
  supplierName: string;
  totalCurrentQuantity: number;
  lotCount: number;
  minExpiryDate: string | null;
  unit?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ProductGroupHeader({
  productCode,
  productName,
  supplierName,
  totalCurrentQuantity,
  lotCount,
  minExpiryDate,
  unit = "EA",
  isExpanded,
  onToggle,
}: ProductGroupHeaderProps) {
  return (
    <div
      className="flex cursor-pointer items-center gap-4 border-b-2 border-slate-200 bg-white px-6 py-4 hover:bg-slate-50"
      onClick={onToggle}
    >
      <div className="flex items-center">
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-slate-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-600" />
        )}
      </div>

      <div className="flex flex-1 items-center gap-8">
        <div className="w-[200px]">
          <div className="text-xs font-medium text-slate-500">製品コード</div>
          <div className="font-semibold text-slate-900">{productCode}</div>
        </div>

        <div className="flex-1">
          <div className="text-xs font-medium text-slate-500">製品名</div>
          <div className="truncate font-semibold text-slate-900" title={productName}>
            {productName}
          </div>
        </div>

        <div className="w-[150px]">
          <div className="text-xs font-medium text-slate-500">仕入先</div>
          <div className="truncate font-semibold text-slate-900" title={supplierName}>
            {supplierName}
          </div>
        </div>

        <div className="w-[120px] text-right">
          <div className="text-xs font-medium text-slate-500">合計在庫</div>
          <div className="font-semibold text-slate-900">{formatQuantity(totalCurrentQuantity, unit)}</div>
        </div>

        <div className="flex w-[180px] items-center gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">ロット数</div>
            <div className="font-semibold text-slate-900">{lotCount} 件</div>
          </div>

          {minExpiryDate && (
            <div>
              <div className="text-xs font-medium text-slate-500">最短有効期限</div>
              <div className="text-sm font-semibold text-slate-900">{minExpiryDate}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
