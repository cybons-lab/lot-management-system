/**
 * テーブル状態管理フック
 * 
 * ページネーション、ソート、選択状態を管理
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * ソート方向
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * ソート状態
 */
export interface SortState<T = string> {
  column: T | null;
  direction: SortDirection;
}

/**
 * ページネーション状態
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * テーブル状態管理フック
 * 
 * @param options - オプション
 * @returns テーブル状態と操作関数
 * 
 * @example
 * ```tsx
 * const table = useTable({
 *   initialPageSize: 25,
 *   initialSort: { column: 'created_at', direction: 'desc' }
 * });
 * 
 * const sortedData = table.sortData(data);
 * const paginatedData = table.paginateData(sortedData);
 * 
 * return (
 *   <DataTable
 *     data={paginatedData}
 *     onSort={table.handleSort}
 *     currentSort={table.sort}
 *     pagination={table.pagination}
 *     onPageChange={table.setPage}
 *   />
 * );
 * ```
 */
export function useTable<T extends string = string>(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSort?: SortState<T>;
}) {
  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(options?.initialPageSize ?? 10);
  const [sort, setSort] = useState<SortState<T>>(
    options?.initialSort ?? { column: null, direction: null }
  );
  
  // ソート処理
  const handleSort = useCallback((column: T) => {
    setSort((prev) => {
      if (prev.column === column) {
        // 同じカラムの場合: asc → desc → null → asc
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { column: null, direction: null };
        }
      }
      // 新しいカラムの場合: asc
      return { column, direction: 'asc' };
    });
    
    // ソート変更時は1ページ目に戻る
    setPage(1);
  }, []);
  
  // ソート状態をリセット
  const resetSort = useCallback(() => {
    setSort({ column: null, direction: null });
  }, []);
  
  // ページネーション処理
  const goToPage = useCallback((newPage: number, totalPages: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, []);
  
  const nextPage = useCallback((totalPages: number) => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  }, []);
  
  const previousPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1));
  }, []);
  
  const firstPage = useCallback(() => {
    setPage(1);
  }, []);
  
  const lastPage = useCallback((totalPages: number) => {
    setPage(totalPages);
  }, []);
  
  // ページサイズ変更
  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // ページサイズ変更時は1ページ目に戻る
  }, []);
  
  // データをソート
  const sortData = useCallback(
    <D extends Record<string, unknown>>(data: D[]): D[] => {
      if (!sort.column || !sort.direction) {
        return data;
      }

      return [...data].sort((a, b) => {
        const aValue = a[sort.column!];
        const bValue = b[sort.column!];

        // null/undefined のハンドリング
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sort.direction === 'asc' ? 1 : -1;
        if (bValue == null) return sort.direction === 'asc' ? -1 : 1;

        // 数値の場合
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sort.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }

        // 文字列の場合
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr < bStr) return sort.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    },
    [sort]
  );
  
  // データをページネーション
  const paginateData = useCallback(
    <D,>(data: D[]): D[] => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return data.slice(startIndex, endIndex);
    },
    [page, pageSize]
  );
  
  // ページネーション情報を計算
  const calculatePagination = useCallback(
    (totalItems: number): PaginationState => {
      const totalPages = Math.ceil(totalItems / pageSize);
      
      return {
        page,
        pageSize,
        totalItems,
        totalPages,
      };
    },
    [page, pageSize]
  );
  
  return {
    // ページネーション
    page,
    pageSize,
    setPage,
    setPageSize: changePageSize,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    
    // ソート
    sort,
    setSort,
    handleSort,
    resetSort,
    
    // ヘルパー
    sortData,
    paginateData,
    calculatePagination,
  };
}

/**
 * 選択状態管理フック
 *
 * @param idKey - アイテムのID キー
 * @returns 選択状態と操作関数
 *
 * @example
 * ```tsx
 * const selection = useSelection('id');
 *
 * return (
 *   <Table>
 *     {items.map(item => (
 *       <TableRow
 *         key={item.id}
 *         selected={selection.isSelected(item.id)}
 *         onClick={() => selection.toggle(item.id)}
 *       />
 *     ))}
 *   </Table>
 * );
 * ```
 */
export function useSelection<T extends Record<string, unknown>>(idKey: keyof T = 'id') {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const isSelected = useCallback(
    (id: string | number) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const select = useCallback((id: string | number) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  
  const selectAll = useCallback((items: T[]) => {
    const ids = items.map((item) => item[idKey] as string | number);
    setSelectedIds(new Set(ids));
  }, [idKey]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback((items: T[]) => {
    const allIds = items.map((item) => item[idKey] as string | number);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      deselectAll();
    } else {
      selectAll(items);
    }
  }, [selectedIds, idKey, selectAll, deselectAll]);
  
  const selectedCount = selectedIds.size;
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  
  return {
    selectedIds,
    selectedArray,
    selectedCount,
    isSelected,
    toggle,
    select,
    deselect,
    selectAll,
    deselectAll,
    toggleAll,
  };
}
