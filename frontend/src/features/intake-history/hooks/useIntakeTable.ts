import { useMemo, useState } from "react";

import { useIntakeHistory } from "./useIntakeHistory";

export interface IntakeHistoryTableFilters {
  supplierId?: number | undefined;
  warehouseId?: number | undefined;
  productId?: number | undefined;
  searchQuery?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

export function useIntakeTable(filters: IntakeHistoryTableFilters) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, error, refetch } = useIntakeHistory({
    ...(filters.supplierId != null ? { supplier_id: Number(filters.supplierId) } : {}),
    ...(filters.warehouseId != null ? { warehouse_id: Number(filters.warehouseId) } : {}),
    ...(filters.productId != null ? { supplier_item_id: Number(filters.productId) } : {}),
    ...(filters.searchQuery != null ? { search: filters.searchQuery } : {}),
    ...(filters.startDate != null ? { start_date: filters.startDate } : {}),
    ...(filters.endDate != null ? { end_date: filters.endDate } : {}),
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  // Deduplicate intakes
  const uniqueIntakes = useMemo(() => {
    const seen = new Set();
    return (data?.intakes || []).filter((item) => {
      if (seen.has(item.intake_id)) return false;
      seen.add(item.intake_id);
      return true;
    });
  }, [data?.intakes]);

  return {
    uniqueIntakes,
    total: data?.total ?? 0,
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading,
    isError,
    error,
    refetch,
  };
}
