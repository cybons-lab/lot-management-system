export interface FilterCandidateOption {
  value: string;
  label: string;
}

export type FilterField = "product" | "supplier" | "warehouse";

interface CandidateFilters {
  supplier_item_id: string;
  supplier_id: string;
  warehouse_id: string;
}

interface CandidateOptions {
  productOptions: FilterCandidateOption[];
  supplierOptions: FilterCandidateOption[];
  warehouseOptions: FilterCandidateOption[];
}

const hasOption = (options: FilterCandidateOption[], value: string) =>
  options.some((option) => option.value === value);

interface ValidationResult {
  productValid: boolean;
  supplierValid: boolean;
  warehouseValid: boolean;
}

const validateFilters = (
  filters: CandidateFilters,
  options: CandidateOptions,
): ValidationResult => ({
  productValid:
    !filters.supplier_item_id || hasOption(options.productOptions, filters.supplier_item_id),
  supplierValid: !filters.supplier_id || hasOption(options.supplierOptions, filters.supplier_id),
  warehouseValid:
    !filters.warehouse_id || hasOption(options.warehouseOptions, filters.warehouse_id),
});

/**
 * Get filter updates to clear invalid selections.
 *
 * R2 Requirement: Clear ONLY invalid selections, regardless of which field was last touched.
 * This ensures valid selections are always preserved.
 *
 * @param _lastTouched - The last touched filter field (kept for backward compatibility, not used in logic)
 * @param filters - Current filter values
 * @param options - Available filter options
 * @returns Updates to clear invalid filters
 */
export const getDependentFilterUpdates = ({
  lastTouched: _lastTouched,
  filters,
  options,
}: {
  lastTouched: FilterField | null;
  filters: CandidateFilters;
  options: CandidateOptions;
}): Partial<CandidateFilters> => {
  const updates: Partial<CandidateFilters> = {};

  // Clear only invalid filters (R2 requirement)
  // Valid filters are ALWAYS preserved, regardless of lastTouched
  const validation = validateFilters(filters, options);

  if (!validation.productValid) updates.supplier_item_id = "";
  if (!validation.supplierValid) updates.supplier_id = "";
  if (!validation.warehouseValid) updates.warehouse_id = "";

  return updates;
};
