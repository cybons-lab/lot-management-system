export type FilterCandidateOption = {
  value: string;
  label: string;
};

export type FilterField = "product" | "supplier" | "warehouse";

type CandidateFilters = {
  product_id: string;
  supplier_id: string;
  warehouse_id: string;
};

type CandidateOptions = {
  productOptions: FilterCandidateOption[];
  supplierOptions: FilterCandidateOption[];
  warehouseOptions: FilterCandidateOption[];
};

const hasOption = (options: FilterCandidateOption[], value: string) =>
  options.some((option) => option.value === value);

export const getDependentFilterUpdates = ({
  lastTouched,
  filters,
  options,
}: {
  lastTouched: FilterField | null;
  filters: CandidateFilters;
  options: CandidateOptions;
}) => {
  const updates: Partial<CandidateFilters> = {};

  if (!lastTouched) {
    return updates;
  }

  const productValid =
    !filters.product_id || hasOption(options.productOptions, filters.product_id);
  const supplierValid =
    !filters.supplier_id || hasOption(options.supplierOptions, filters.supplier_id);
  const warehouseValid =
    !filters.warehouse_id || hasOption(options.warehouseOptions, filters.warehouse_id);

  if (lastTouched === "product") {
    if (!supplierValid) {
      updates.supplier_id = "";
    }
    if (!warehouseValid) {
      updates.warehouse_id = "";
    }
  }

  if (lastTouched === "supplier") {
    if (!productValid) {
      updates.product_id = "";
    }
    if (!warehouseValid) {
      updates.warehouse_id = "";
    }
  }

  if (lastTouched === "warehouse") {
    if (!productValid) {
      updates.product_id = "";
    }
    if (!supplierValid) {
      updates.supplier_id = "";
    }
  }

  return updates;
};
