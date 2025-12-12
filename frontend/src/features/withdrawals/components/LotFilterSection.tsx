/**
 * LotFilterSection - Lot filtering section for withdrawal form
 *
 * Filter order: Supplier → Product
 * Displays count of matching lots based on current filters
 */

import { Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import type { Product, Supplier } from "@/types/api";

interface LotFilterSectionProps {
  suppliers: Supplier[];
  products: Product[];
  filteredProducts: Product[];
  isLoadingSuppliers: boolean;
  isLoadingProducts: boolean;
  filteredLotsCount: number;
  filters: {
    supplier_id: number;
    product_id: number;
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
          <Select
            value={filters.supplier_id ? String(filters.supplier_id) : ""}
            onValueChange={(v) => onSupplierChange(v ? Number(v) : 0)}
            disabled={isLoadingSuppliers}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingSuppliers ? "読み込み中..." : "すべて"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">すべて</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.supplier_code} - {s.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product filter */}
        <div>
          <Label htmlFor="filter_product" className="mb-2 block text-sm font-medium">
            製品{" "}
            {filteredProducts.length < products.length && (
              <span className="text-xs text-slate-500">({filteredProducts.length}件)</span>
            )}
          </Label>
          <Select
            value={filters.product_id ? String(filters.product_id) : ""}
            onValueChange={(v) => onProductChange(v ? Number(v) : 0)}
            disabled={isLoadingProducts}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingProducts ? "読み込み中..." : "すべて"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">すべて</SelectItem>
              {filteredProducts.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.product_code} - {p.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter result count */}
      <div className="mt-3 text-sm text-slate-600">
        絞り込み結果: <span className="font-semibold">{filteredLotsCount}</span> 件のロット
      </div>
    </div>
  );
}
