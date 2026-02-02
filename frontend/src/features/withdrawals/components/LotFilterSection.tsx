/**
 * LotFilterSection - Lot filtering section for withdrawal form
 *
 * Filter order: Supplier → Product
 * Displays count of matching lots based on current filters
 */

import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import type { SupplierProduct } from "@/features/supplier-products/api";
import type { Supplier } from "@/features/suppliers/validators/supplier-schema";

interface LotFilterSectionProps {
  suppliers: Supplier[];
  products: SupplierProduct[];
  filteredProducts: SupplierProduct[];
  isLoadingSuppliers: boolean;
  isLoadingProducts: boolean;
  filteredLotsCount: number;
  filters: {
    supplier_id: number;
    product_group_id: number;
  };
  onSupplierChange: (supplierId: number) => void;
  onProductChange: (productId: number) => void;
}

export function LotFilterSection({
  suppliers,
  products,
  filteredProducts,
  isLoadingSuppliers,
  isLoadingProducts,
  filteredLotsCount,
  filters,
  onSupplierChange,
  onProductChange,
}: LotFilterSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">ロット絞り込み</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Supplier filter */}
        <div>
          <Label htmlFor="filter_supplier" className="mb-2 block text-sm font-medium">
            仕入元
          </Label>
          <SearchableSelect
            options={[
              { value: "", label: "すべて" },
              ...suppliers.map((s) => ({
                value: String(s.id),
                label: `${s.supplier_code} - ${s.supplier_name}`,
              })),
            ]}
            value={filters.supplier_id ? String(filters.supplier_id) : ""}
            onChange={(v) => onSupplierChange(v ? Number(v) : 0)}
            placeholder={isLoadingSuppliers ? "読み込み中..." : "仕入元を検索..."}
            disabled={isLoadingSuppliers}
          />
        </div>

        {/* Product filter */}
        <div>
          <Label htmlFor="filter_product" className="mb-2 block text-sm font-medium">
            商品{" "}
            {filteredProducts.length < products.length && (
              <span className="text-xs text-slate-500">({filteredProducts.length}件)</span>
            )}
          </Label>
          <SearchableSelect
            options={[
              { value: "", label: "すべて" },
              ...filteredProducts.map((p) => ({
                value: String(p.id),
                label: `${p.maker_part_no} - ${p.display_name}`,
              })),
            ]}
            value={filters.product_group_id ? String(filters.product_group_id) : ""}
            onChange={(v) => onProductChange(v ? Number(v) : 0)}
            placeholder={isLoadingProducts ? "読み込み中..." : "商品を検索..."}
            disabled={isLoadingProducts}
          />
        </div>
      </div>

      {/* Filter result count */}
      <div className="mt-3 text-sm text-slate-600">
        絞り込み結果: <span className="font-semibold">{filteredLotsCount}</span> 件のロット
      </div>
    </div>
  );
}
