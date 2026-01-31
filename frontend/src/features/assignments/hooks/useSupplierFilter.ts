/**
 * useSupplierFilter - 担当仕入先フィルタリングの共通ロジック
 *
 * 担当仕入先がある場合、自動的にフィルタを有効化し、
 * 担当仕入先のみを表示するロジックを提供します。
 *
 * 使用例:
 * ```tsx
 * // 通常のページ（自動フィルタ有効）
 * const { filterEnabled, toggleFilter, filterSuppliers, hasAssignedSuppliers } = useSupplierFilter();
 *
 * // アカウント設定ページ（自動フィルタ無効）
 * const { filterEnabled, toggleFilter, filterSuppliers } = useSupplierFilter({ disableAutoFilter: true });
 *
 * // データをフィルタリング
 * const filteredData = filterSuppliers(allData, (item) => item.supplier_id);
 *
 * // UIでチェックボックス表示
 * <SupplierFilterCheckbox enabled={filterEnabled} onToggle={toggleFilter} />
 * ```
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useMySuppliers } from "./useMySuppliers";

interface UseSupplierFilterOptions {
  /** 自動フィルタを無効化する（アカウント設定ページなど） */
  disableAutoFilter?: boolean;
}

export function useSupplierFilter(options: UseSupplierFilterOptions = {}) {
  const { disableAutoFilter = false } = options;

  // 担当仕入先を取得
  const { data: mySuppliers } = useMySuppliers();
  const assignedSupplierIds = useMemo(
    () => mySuppliers?.all_supplier_ids || [],
    [mySuppliers?.all_supplier_ids],
  );

  const hasAssignedSuppliers = assignedSupplierIds.length > 0;

  // フィルタの有効/無効状態
  // - 自動フィルタが無効の場合: 常にfalse
  // - 自動フィルタが有効の場合: デフォルトtrue（担当がなくてもON）
  const [filterEnabled, setFilterEnabled] = useState(!disableAutoFilter);
  // 初期化済みフラグ
  const [isInitialized, setIsInitialized] = useState(false);

  // 担当仕入先が読み込まれた時に一度だけ自動的にONにする（自動フィルタが有効な場合）
  useEffect(() => {
    if (!isInitialized && !disableAutoFilter && hasAssignedSuppliers) {
      setFilterEnabled(true);
      setIsInitialized(true);
    }
  }, [disableAutoFilter, hasAssignedSuppliers, isInitialized]);

  // フィルタのON/OFFを切り替え
  const toggleFilter = useCallback((enabled: boolean) => {
    setFilterEnabled(enabled);
    setIsInitialized(true); // 手動操作された場合も「初期化済み」とする
  }, []);

  // データをフィルタリングする汎用関数
  const filterSuppliers = useCallback(
    <T>(data: T[], getSupplier: (item: T) => number | undefined | null): T[] => {
      // フィルタが無効な場合は全データを返す
      if (!filterEnabled) {
        return data;
      }

      // 担当仕入先のみをフィルタリング
      // 担当が0件の場合は空配列が返る（正しい挙動）
      return data.filter((item) => {
        const supplierId = getSupplier(item);
        return supplierId != null && assignedSupplierIds.includes(supplierId);
      });
    },
    [filterEnabled, assignedSupplierIds],
  );

  return {
    /** フィルタの有効/無効状態 */
    filterEnabled,
    /** フィルタのON/OFFを切り替え */
    toggleFilter,
    /** データをフィルタリングする関数 */
    filterSuppliers,
    /** 担当仕入先が設定されているか */
    hasAssignedSuppliers,
    /** 担当仕入先IDの配列 */
    assignedSupplierIds,
  };
}
