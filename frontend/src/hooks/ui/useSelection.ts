/**
 * 選択状態管理フック
 *
 * テーブルやリストでの複数選択機能を提供
 */

import { useState, useCallback, useMemo } from "react";

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
export function useSelection<T extends Record<string, unknown>>(idKey: keyof T = "id") {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const isSelected = useCallback((id: string | number) => selectedIds.has(id), [selectedIds]);

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

  const selectAll = useCallback(
    (items: T[]) => {
      const ids = items.map((item) => item[idKey] as string | number);
      setSelectedIds(new Set(ids));
    },
    [idKey],
  );

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(
    (items: T[]) => {
      const allIds = items.map((item) => item[idKey] as string | number);
      const allSelected = allIds.every((id) => selectedIds.has(id));

      if (allSelected) {
        deselectAll();
      } else {
        selectAll(items);
      }
    },
    [selectedIds, idKey, selectAll, deselectAll],
  );

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
