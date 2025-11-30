import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

import { useLotDataProcessing } from "@/features/inventory/hooks/useLotDataProcessing";
import { useLotMutations } from "@/features/inventory/hooks/useLotMutations";
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import { useLotsQuery } from "@/hooks/api";
import { useDebounce } from "@/hooks/ui/useDebounce";

/**
 * LotListPanel のビジネスロジックを管理するカスタムフック
 */
export function useLotListLogic() {
    const [filters, setFilters] = useAtom(lotFiltersAtom);
    const [tableSettings, setTableSettings] = useAtom(lotTableSettingsAtom);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (debouncedSearchTerm !== filters.search) {
            setFilters((prev) => ({ ...prev, search: debouncedSearchTerm }));
            setTableSettings((prev) => ({ ...prev, page: 0 }));
        }
    }, [debouncedSearchTerm, filters.search, setFilters, setTableSettings]);

    const {
        data: allLots = [],
        isLoading,
        error,
        refetch,
    } = useLotsQuery({
        with_stock: filters.inStockOnly || undefined,
        product_code: filters.productCode ?? undefined,
        delivery_place_code: filters.warehouseCode ?? undefined,
    });

    const mutations = useLotMutations(allLots);
    const { sortedLots, groupedLots } = useLotDataProcessing(allLots, filters.search ?? "", tableSettings);

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
