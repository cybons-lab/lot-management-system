/**
 * FilterContainer コンポーネント
 *
 * 検索バーとフィルターパネルを統合したコンテナ
 * - SearchBar 組み込み
 * - 詳細フィルターの展開/非表示
 * - リセットボタン
 * - レスポンシブ対応
 */

import { ChevronDown, ChevronRight, X, Menu } from "lucide-react";
import { useState } from "react";

import { SearchBar } from "./SearchBar";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

/**
 * FilterContainer Props
 */
export interface FilterContainerProps {
  /** 子要素（詳細フィルター項目） */
  children?: React.ReactNode;

  /** 検索値 */
  searchValue?: string;

  /** 検索値変更ハンドラ */
  onSearchChange?: (value: string) => void;

  /** 検索バーのプレースホルダー */
  searchPlaceholder?: string;

  /** リセットハンドラ */
  onReset?: () => void;

  /** 詳細フィルターを展開可能にするか */
  collapsible?: boolean;

  /** 詳細フィルターのデフォルト展開状態 */
  defaultExpanded?: boolean;

  /** 詳細フィルターボタンのテキスト */
  expandButtonText?: string;

  /** クラス名 */
  className?: string;

  /** 検索バーを非表示にするか */
  hideSearch?: boolean;
}

/**
 * フィルターコンテナ
 *
 * 検索バーと詳細フィルターを統合したコンポーネント。
 * LotsPageFilters のような「検索 + 詳細フィルター展開」パターンを統一実装。
 *
 * @example
 * ```tsx
 * <FilterContainer
 *   searchValue={filters.search}
 *   onSearchChange={(value) => setFilter('search', value)}
 *   onReset={resetFilters}
 *   collapsible
 * >
 *   <FilterField label="カテゴリ">
 *     <Select value={filters.category} onChange={...} />
 *   </FilterField>
 * </FilterContainer>
 * ```
 */
// eslint-disable-next-line complexity, max-lines-per-function -- フィルタコンテナの論理的なまとまり
export function FilterContainer({
  children,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "検索...",
  onReset,
  collapsible = true,
  defaultExpanded = false,
  expandButtonText = "詳細フィルター",
  className,
  hideSearch = false,
}: FilterContainerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const hasAdvancedFilters = children !== undefined && children !== null;
  const showExpandButton = collapsible && hasAdvancedFilters;

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {/* ハンバーガーメニュートグル（小型画面用） */}
      <button
        type="button"
        onClick={() => setIsFilterVisible(!isFilterVisible)}
        className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-colors"
        aria-label="フィルタを表示/非表示"
      >
        <Menu className="h-5 w-5" />
        <span>フィルタ</span>
        <span className="text-xs text-gray-500">{isFilterVisible ? "（開く）" : "（閉じる）"}</span>
      </button>

      {/* 検索バー + ボタンエリア */}
      <div className={cn("flex gap-2", "lg:flex", !isFilterVisible && "hidden lg:flex")}>
        {/* 検索バー */}
        {!hideSearch && onSearchChange && (
          <div className="flex-1">
            <SearchBar
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {/* 詳細フィルター展開ボタン */}
        {showExpandButton && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="whitespace-nowrap"
          >
            {expandButtonText}
            {isExpanded ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronRight className="ml-2 h-4 w-4" />
            )}
          </Button>
        )}

        {/* リセットボタン */}
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10 whitespace-nowrap text-slate-700"
            aria-label="フィルターをリセット"
          >
            <X className="mr-1 h-4 w-4" />
            リセット
          </Button>
        )}
      </div>

      {/* 詳細フィルターエリア */}
      {hasAdvancedFilters && (!collapsible || isExpanded) && (
        <div
          className={cn(
            "mt-4 space-y-4 border-t border-slate-200 pt-4",
            "lg:block",
            !isFilterVisible && "hidden lg:block",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * シンプル版 FilterContainer
 *
 * 展開機能なし、検索バー + フィルター項目を常に表示。
 *
 * @example
 * ```tsx
 * <SimpleFilterContainer
 *   searchValue={filters.search}
 *   onSearchChange={(value) => setFilter('search', value)}
 *   onReset={resetFilters}
 * >
 *   <FilterField label="ステータス">
 *     <Select ... />
 *   </FilterField>
 * </SimpleFilterContainer>
 * ```
 */
export function SimpleFilterContainer({
  children,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "検索...",
  onReset,
  className,
  hideSearch = false,
}: Omit<FilterContainerProps, "collapsible" | "defaultExpanded" | "expandButtonText">) {
  return (
    <FilterContainer
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      onReset={onReset}
      collapsible={false}
      className={className}
      hideSearch={hideSearch}
    >
      {children}
    </FilterContainer>
  );
}

/**
 * インライン版 FilterContainer
 *
 * 検索バーなし、フィルター項目を横並びで表示。
 * ページヘッダーに配置する場合などに使用。
 *
 * @example
 * ```tsx
 * <InlineFilterContainer onReset={resetFilters}>
 *   <FilterField label="カテゴリ">
 *     <Select ... />
 *   </FilterField>
 *   <FilterField label="ステータス">
 *     <Select ... />
 *   </FilterField>
 * </InlineFilterContainer>
 * ```
 */
export function InlineFilterContainer({
  children,
  onReset,
  className,
}: {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>
      {children}
      {onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-10"
          aria-label="フィルターをリセット"
        >
          <X className="mr-1 h-4 w-4" />
          リセット
        </Button>
      )}
    </div>
  );
}
