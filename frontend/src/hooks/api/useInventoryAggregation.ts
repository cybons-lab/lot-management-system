/**
 * 在庫集計情報取得用のカスタムフック
 *
 * サプライヤー別、倉庫別、製品別の在庫集計データを取得します。
 */

import { useQuery } from "@tanstack/react-query";

import {
  getInventoryByProduct,
  getInventoryBySupplier,
  getInventoryByWarehouse,
} from "@/features/inventory/api";

/**
 * サプライヤー別在庫集計を取得するフック
 *
 * @returns TanStack QueryのuseQuery結果
 *
 * @example
 * ```tsx
 * const { data: supplierInventory, isLoading } = useInventoryBySupplier();
 * ```
 */
export const useInventoryBySupplier = () => {
  return useQuery({
    queryKey: ["inventory", "by-supplier"],
    queryFn: () => getInventoryBySupplier(),
  });
};

/**
 * 倉庫別在庫集計を取得するフック
 *
 * @returns TanStack QueryのuseQuery結果
 *
 * @example
 * ```tsx
 * const { data: warehouseInventory, isLoading } = useInventoryByWarehouse();
 * ```
 */
export const useInventoryByWarehouse = () => {
  return useQuery({
    queryKey: ["inventory", "by-warehouse"],
    queryFn: () => getInventoryByWarehouse(),
  });
};

/**
 * 製品別在庫集計を取得するフック
 *
 * @returns TanStack QueryのuseQuery結果
 *
 * @example
 * ```tsx
 * const { data: productInventory, isLoading } = useInventoryByProduct();
 * ```
 */
export const useInventoryByProduct = () => {
  return useQuery({
    queryKey: ["inventory", "by-product"],
    queryFn: () => getInventoryByProduct(),
  });
};
