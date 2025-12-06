/**
 * CustomerItemsFilter - Filter section for customer items page.
 */
import { useMemo } from "react";

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";

interface CustomerItemsFilterProps {
  filters: {
    customer_id: string;
    product_id: string;
  };
  setFilters: (filters: { customer_id: string; product_id: string }) => void;
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
  const { data: products = [] } = useProductsQuery();

  // Generate filter options
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.customer_code} - ${c.customer_name}`,
      })),
    [customers],
  );

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: `${p.product_code} - ${p.product_name}`,
      })),
    [products],
  );

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">フィルター</h3>
      <div className="grid gap-4 md:grid-cols-3">
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
        <div>
          <Label htmlFor="filter-product" className="mb-2 block text-sm font-medium">
            製品
          </Label>
          <SearchableSelect
            options={productOptions}
            value={filters.product_id}
            onChange={(value) => setFilters({ ...filters, product_id: value })}
            placeholder="製品を検索..."
          />
        </div>
        <div>
          <Label htmlFor="filter-search" className="mb-2 block text-sm font-medium">
            検索
          </Label>
          <Input
            id="filter-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="品番で検索..."
          />
        </div>
      </div>
    </div>
  );
}
