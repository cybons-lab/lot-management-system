import { useMemo } from "react";

import { groupLotsByProduct } from "@/features/inventory/utils/groupLots";
import type { LotUI } from "@/shared/libs/normalize";

interface TableSettings {
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * ロットデータのフィルタリング、ソート、ページネーション、グループ化を管理
 */
export function useLotDataProcessing(
  allLots: LotUI[],
  searchTerm: string,
  tableSettings: TableSettings,
) {
  const filteredLots = useMemo(() => {
    if (!searchTerm) return allLots;
    const searchLower = searchTerm.toLowerCase();
    return allLots.filter(
      (lot) =>
        lot.lot_number?.toLowerCase().includes(searchLower) ||
        lot.product_code?.toLowerCase().includes(searchLower) ||
        lot.product_name?.toLowerCase().includes(searchLower),
    );
  }, [allLots, searchTerm]);

  const sortedLots = useMemo(() => {
    if (!tableSettings.sortColumn) return filteredLots;
    return [...filteredLots].sort((a, b) => {
      const aVal = a[tableSettings.sortColumn as keyof LotUI];
      const bVal = b[tableSettings.sortColumn as keyof LotUI];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return tableSettings.sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return tableSettings.sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredLots, tableSettings.sortColumn, tableSettings.sortDirection]);

  const paginatedLots = useMemo(() => {
    const start = (tableSettings.page ?? 0) * (tableSettings.pageSize ?? 25);
    return sortedLots.slice(start, start + (tableSettings.pageSize ?? 25));
  }, [sortedLots, tableSettings.page, tableSettings.pageSize]);

  const groupedLots = useMemo(() => groupLotsByProduct(paginatedLots), [paginatedLots]);

  return { sortedLots, groupedLots };
}
