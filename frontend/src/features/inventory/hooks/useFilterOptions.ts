/**
 * useFilterOptions - 相互フィルタリング用フック
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getFilterOptions, type FilterOptions } from "@/features/inventory/api";

interface UseFilterOptionsParams {
  product_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  tab?: string;
  primary_staff_only?: boolean;
  mode?: "stock" | "master";
  onAutoSelectSupplier?: (supplierId: string) => void;
  onAutoSelectProduct?: (productId: string) => void;
}

export function useFilterOptions({
  product_id,
  supplier_id,
  warehouse_id,
  tab,
  primary_staff_only,
  mode = "stock",
  onAutoSelectSupplier,
  onAutoSelectProduct,
}: UseFilterOptionsParams) {
  const { data, isLoading } = useQuery<FilterOptions>({
    queryKey: [
      "filter-options",
      product_id,
      supplier_id,
      warehouse_id,
      tab,
      primary_staff_only,
      mode,
    ],
    queryFn: () =>
      getFilterOptions({
        product_id: product_id ? Number(product_id) : undefined,
        supplier_id: supplier_id ? Number(supplier_id) : undefined,
        warehouse_id: warehouse_id ? Number(warehouse_id) : undefined,
        tab,
        primary_staff_only,
        mode,
      }),
    staleTime: 30000, // 30秒間キャッシュ
  });

  // 製品選択時、仕入先が1件なら自動選択
  useEffect(() => {
    if (product_id && data?.suppliers.length === 1 && !supplier_id) {
      onAutoSelectSupplier?.(String(data.suppliers[0].id));
    }
  }, [product_id, data?.suppliers, supplier_id, onAutoSelectSupplier]);

  // 仕入先選択時、製品が1件なら自動選択
  useEffect(() => {
    if (supplier_id && data?.products.length === 1 && !product_id) {
      onAutoSelectProduct?.(String(data.products[0].id));
    }
  }, [supplier_id, data?.products, product_id, onAutoSelectProduct]);

  // フィルタ済みオプション生成
  const productOptions = (data?.products ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.code} - ${p.name}`,
  }));

  const supplierOptions = (data?.suppliers ?? []).map((s) => ({
    value: String(s.id),
    label: `${s.code} - ${s.name}`,
  }));

  const warehouseOptions = (data?.warehouses ?? []).map((w) => ({
    value: String(w.id),
    label: `${w.code} - ${w.name}`,
  }));

  return {
    productOptions,
    supplierOptions,
    warehouseOptions,
    isLoading,
  };
}
