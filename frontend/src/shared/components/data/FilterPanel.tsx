/**
 * FilterPanel.tsx
 *
 * フィルターパネルコンポーネント
 * - 複数フィルター項目の表示
 * - 開閉機能
 * - リセット機能
 */

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

export interface FilterPanelProps {
  /** フィルターのタイトル */
  title?: string;
  /** 子要素(フィルター項目) */
  children: React.ReactNode;
  /** 初期開閉状態 */
  defaultOpen?: boolean;
  /** リセットボタンのコールバック */
  onReset?: () => void;
  /** 開閉可能かどうか */
  collapsible?: boolean;
  /** クラス名 */
  className?: string;
}

// ============================================
// メインコンポーネント
// ============================================

export function FilterPanel({
  title = "フィルター",
  children,
  defaultOpen = true,
  onReset,
  collapsible = true,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white shadow-sm", className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-500 transition-colors hover:text-gray-700"
              aria-label={isOpen ? "フィルターを閉じる" : "フィルターを開く"}
            >
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          )}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>

        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs">
            <X className="mr-1 h-4 w-4" />
            リセット
          </Button>
        )}
      </div>

      {/* フィルター項目 */}
      {(!collapsible || isOpen) && <div className="space-y-4 p-4">{children}</div>}
    </div>
  );
}

// ============================================
// コンパクト版フィルターパネル
// ============================================

export interface CompactFilterPanelProps {
  /** 子要素(フィルター項目) */
  children: React.ReactNode;
  /** リセットボタンのコールバック */
  onReset?: () => void;
  /** クラス名 */
  className?: string;
}

/**
 * コンパクト版フィルターパネル
 * (タイトルなし、開閉なし)
 */
export function CompactFilterPanel({ children, onReset, className }: CompactFilterPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {onReset && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onReset} className="h-8 text-xs">
            <X className="mr-1 h-4 w-4" />
            リセット
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================
// インラインフィルターパネル
// ============================================

export interface InlineFilterPanelProps {
  /** 子要素(フィルター項目) */
  children: React.ReactNode;
  /** リセットボタンのコールバック */
  onReset?: () => void;
  /** クラス名 */
  className?: string;
}

/**
 * インラインフィルターパネル
 * (横並びレイアウト用)
 */
export function InlineFilterPanel({ children, onReset, className }: InlineFilterPanelProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>
      {children}
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset} className="h-10">
          <X className="mr-1 h-4 w-4" />
          リセット
        </Button>
      )}
    </div>
  );
}
