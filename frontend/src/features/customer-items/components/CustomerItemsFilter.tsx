/**
 * CustomerItemsFilter - Filter section for customer items page (FilterContainer使用版).
 */
import { useMemo } from "react";

import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useCustomersQuery } from "@/hooks/api/useMastersQuery";
import { SimpleFilterContainer } from "@/shared/components/data/FilterContainer";

interface CustomerItemsFilterProps {
  filters: {
    customer_id: string;
  };
  setFilters: (filters: { customer_id: string }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function CustomerItemsFilter({
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
}: CustomerItemsFilterProps) {
  // Master data for filter options
  const { data: customers = [] } = useCustomersQuery();

  // Generate filter options
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.customer_code} - ${c.customer_name}`,
      })),
    [customers],
  );

  const handleReset = () => {
    setFilters({ customer_id: "" });
    setSearchQuery("");
  };

  return (
    <SimpleFilterContainer
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="品番で検索..."
      onReset={handleReset}
    >
      <div>
        <Label htmlFor="filter-customer" className="mb-2 block text-sm font-medium">
          得意先
        </Label>
        <SearchableSelect
          options={customerOptions}
          value={filters.customer_id}
          onChange={(value) => setFilters({ ...filters, customer_id: value })}
          placeholder="得意先を検索..."
        />
      </div>
    </SimpleFilterContainer>
  );
}
