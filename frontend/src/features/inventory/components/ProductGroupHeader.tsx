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
      className="flex cursor-pointer items-center gap-4 bg-gray-100 px-4 py-3 font-medium hover:bg-gray-200"
      onClick={onToggle}
    >
      <div className="flex items-center">
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        )}
      </div>

      <div className="grid flex-1 grid-cols-5 gap-4">
        <div>
          <div className="text-xs text-gray-500">製品コード</div>
          <div className="font-medium">{productCode}</div>
        </div>

        <div className="col-span-1">
          <div className="text-xs text-gray-500">製品名</div>
          <div className="truncate font-medium" title={productName}>
            {productName}
          </div>
        </div>

        <div className="col-span-1">
          <div className="text-xs text-gray-500">仕入先</div>
          <div className="truncate font-medium" title={supplierName}>
            {supplierName}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">合計在庫</div>
          <div className="font-medium">{formatQuantity(totalCurrentQuantity, unit)}</div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-gray-500">ロット数</div>
            <div className="font-medium">{lotCount} 件</div>
          </div>

          {minExpiryDate && (
            <div>
              <div className="text-xs text-gray-500">最短有効期限</div>
              <div className="text-sm font-medium">{minExpiryDate}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
