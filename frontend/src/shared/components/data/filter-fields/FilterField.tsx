/**
 * FilterField - フィルター項目の共通ラッパー
 */

import type { ReactNode } from "react";

import { Label } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

export interface FilterFieldProps {
  /** ラベル */
  label: string;
  /** 子要素 */
  children: ReactNode;
  /** 説明文 */
  description?: string;
  /** label要素のhtmlFor */
  htmlFor?: string;
  /** クラス名 */
  className?: string;
}

/**
 * フィルター用の共通ラッパーコンポーネント
 * - ラベルと補足説明を表示
 * - 子要素を縦に配置
 */
export function FilterField({
  label,
  children,
  description,
  htmlFor,
  className,
}: FilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}
