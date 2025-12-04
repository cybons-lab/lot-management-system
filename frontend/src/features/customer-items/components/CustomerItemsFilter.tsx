/**
 * CustomerItemsFilter - Filter section for customer items page.
 */
import { Input } from "@/components/ui";

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
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">フィルター</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="filter-customer-id" className="mb-2 block text-sm font-medium">
            得意先ID
          </label>
          <Input
            id="filter-customer-id"
            type="number"
            value={filters.customer_id}
            onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
            placeholder="得意先IDで絞り込み"
          />
        </div>
        <div>
          <label htmlFor="filter-product-id" className="mb-2 block text-sm font-medium">
            製品ID
          </label>
          <Input
            id="filter-product-id"
            type="number"
            value={filters.product_id}
            onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
            placeholder="製品IDで絞り込み"
          />
        </div>
        <div>
          <label htmlFor="filter-search" className="mb-2 block text-sm font-medium">
            検索
          </label>
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
