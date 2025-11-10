/**
 * TablePagination.tsx
 *
 * テーブルのページネーションコンポーネント
 * - ページ移動
 * - ページサイズ変更
 * - 件数表示
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

export interface TablePaginationProps {
  /** 現在のページ番号(1始まり) */
  currentPage: number;
  /** 1ページあたりの表示件数 */
  pageSize: number;
  /** 総件数 */
  totalCount: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** ページサイズ変更時のコールバック */
  onPageSizeChange: (pageSize: number) => void;
  /** ページサイズのオプション */
  pageSizeOptions?: number[];
  /** クラス名 */
  className?: string;
}

// ============================================
// メインコンポーネント
// ============================================

export function TablePagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: TablePaginationProps) {
  // 総ページ数
  const totalPages = Math.ceil(totalCount / pageSize);

  // 表示範囲
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // ページ移動
  const goToFirstPage = () => onPageChange(1);
  const goToPreviousPage = () => onPageChange(Math.max(1, currentPage - 1));
  const goToNextPage = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => onPageChange(totalPages);

  // ボタン無効化判定
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoData = totalCount === 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3",
        className,
      )}
    >
      {/* 左側: 表示件数 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">表示件数:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value: string) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-700">
          {hasNoData ? (
            <span>データがありません</span>
          ) : (
            <span>
              {totalCount.toLocaleString()} 件中 {startIndex.toLocaleString()} -{" "}
              {endIndex.toLocaleString()} 件を表示
            </span>
          )}
        </div>
      </div>

      {/* 右側: ページネーション */}
      <div className="flex items-center gap-2">
        {/* 最初のページ */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToFirstPage}
          disabled={isFirstPage || hasNoData}
          aria-label="最初のページ"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* 前のページ */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousPage}
          disabled={isFirstPage || hasNoData}
          aria-label="前のページ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* ページ番号表示 */}
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm text-gray-700">
            ページ {currentPage} / {totalPages || 1}
          </span>
        </div>

        {/* 次のページ */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextPage}
          disabled={isLastPage || hasNoData}
          aria-label="次のページ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* 最後のページ */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          disabled={isLastPage || hasNoData}
          aria-label="最後のページ"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// シンプル版ページネーション
// ============================================

export interface SimplePaginationProps {
  /** 現在のページ番号(1始まり) */
  currentPage: number;
  /** 総ページ数 */
  totalPages: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** クラス名 */
  className?: string;
}

/**
 * シンプル版ページネーション
 * (ページサイズ変更なし、ページ移動のみ)
 */
export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoPages = totalPages === 0;

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage || hasNoPages}
      >
        <ChevronLeft className="h-4 w-4" />
        前へ
      </Button>

      <span className="text-sm text-gray-700">
        {currentPage} / {totalPages || 1}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage || hasNoPages}
      >
        次へ
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
