import { useMemo } from "react";

import type { InboundPlansFilters } from "../types";

import type { Supplier } from "@/features/suppliers/validators/supplier-schema";
import { useSuppliersQuery } from "@/hooks/api/useMastersQuery";

interface UseInboundPlansFilterLogicParams {
  onFilterChange: (filters: InboundPlansFilters) => void;
  onSearchChange: (query: string) => void;
}

export function useInboundPlansFilterLogic({
  onFilterChange,
  onSearchChange,
}: UseInboundPlansFilterLogicParams) {
  const { data: suppliers = [] } = useSuppliersQuery();

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s: Supplier) => ({
        value: String(s.id),
        label: `${s.supplier_code} - ${s.supplier_name}`,
      })),
    [suppliers],
  );

  const handleResetFilters = () => {
    onFilterChange({
      supplier_id: "",
      supplier_item_id: "",
      status: "",
      date_from: "",
      date_to: "",
      prioritize_assigned: false,
    });
    onSearchChange("");
  };

  return {
    supplierOptions,
    handleResetFilters,
  };
}
