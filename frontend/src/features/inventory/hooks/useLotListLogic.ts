import { useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";

import { useLotMutations } from "@/features/inventory/hooks/useLotMutations";
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import {
  inventoryLotsGroupedAtom,
  inventoryLotsQueryParamsAtom,
  inventoryLotsRawDataAtom,
  inventoryLotsRawLoadableAtom,
  inventoryLotsSortedAtom,
} from "@/features/inventory/state/atoms";
import { useDebounce } from "@/hooks/ui/useDebounce";

/**
 * LotListPanel のビジネスロジックを管理するカスタムフック
 */
export function useLotListLogic() {
  const [filters, setFilters] = useAtom(lotFiltersAtom);
  const [tableSettings, setTableSettings] = useAtom(lotTableSettingsAtom);
  const lotsQueryParams = useAtomValue(inventoryLotsQueryParamsAtom);
  const lotsLoadable = useAtomValue(inventoryLotsRawLoadableAtom);
  const allLots = useAtomValue(inventoryLotsRawDataAtom);
  const sortedLots = useAtomValue(inventoryLotsSortedAtom);
  const groupedLots = useAtomValue(inventoryLotsGroupedAtom);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      setFilters((prev) => ({ ...prev, search: debouncedSearchTerm }));
      setTableSettings((prev) => ({ ...prev, page: 0 }));
    }
  }, [debouncedSearchTerm, filters.search, setFilters, setTableSettings]);

  const mutations = useLotMutations(allLots);
  const isLoading = lotsLoadable.state === "loading";
  const error = lotsLoadable.state === "hasError" ? lotsLoadable.error : null;

  const handleFilterChange = useCallback(
    (key: string, value: unknown) => {
      setFilters({ ...filters, [key]: value });
      setTableSettings({ ...tableSettings, page: 0 });
    },
    [filters, tableSettings, setFilters, setTableSettings],
  );

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setFilters({
      search: "",
      productCode: null,
      warehouseCode: null,
      status: "all",
      inStockOnly: false,
    });
    setTableSettings({ ...tableSettings, page: 0 });
  }, [tableSettings, setFilters, setTableSettings]);

  const refetch = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ["lots", lotsQueryParams] });
  }, [queryClient, lotsQueryParams]);

  return {
    filters,
    tableSettings,
    expandedGroups,
    searchTerm,
    isAdvancedFilterOpen,
    allLots,
    sortedLots,
    groupedLots,
    isLoading,
    error,
    ...mutations,
    handleFilterChange,
    handleResetFilters,
    refetch,
    setSearchTerm,
    setIsAdvancedFilterOpen,
    setExpandedGroups,
    setTableSettings,
  };
}
