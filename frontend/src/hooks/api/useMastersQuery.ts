/**
 * マスタデータ取得フック
 *
 * 製品、得意先、倉庫などのマスタデータ取得ロジックを集約
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { Customer } from "@/features/customers/validators/customer-schema";
import type { Product } from "@/features/products/validators/product-schema";
import type { Warehouse } from "@/features/warehouses/validators/warehouse-schema";
import { listProducts, listCustomers, listWarehouses } from "@/services/api/master-service";
import { QUERY_KEYS } from "@/services/api/query-keys";

/**
 * 製品マスタ一覧を取得するフック
 *
 * @param options - React Query オプション
 * @returns 製品一覧のクエリ結果
 *
 * @example
 * ```tsx
 * const { data: products, isLoading } = useProductsQuery();
 * ```
 */
export function useProductsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}): UseQueryResult<Product[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.masters.products(),
    queryFn: listProducts,
    staleTime: options?.staleTime ?? 300000, // 5分（マスタは変更頻度が低い）
    enabled: options?.enabled ?? true,
  });
}

/**
 * 得意先マスタ一覧を取得するフック
 *
 * @param options - React Query オプション
 * @returns 得意先一覧のクエリ結果
 *
 * @example
 * ```tsx
 * const { data: customers, isLoading } = useCustomersQuery();
 * ```
 */
export function useCustomersQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}): UseQueryResult<Customer[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.masters.customers(),
    queryFn: listCustomers,
    staleTime: options?.staleTime ?? 300000, // 5分
    enabled: options?.enabled ?? true,
  });
}

/**
 * 倉庫マスタ一覧を取得するフック
 *
 * @param options - React Query オプション
 * @returns 倉庫一覧のクエリ結果
 *
 * @example
 * ```tsx
 * const { data: warehouses, isLoading } = useWarehousesQuery();
 * ```
 */
export function useWarehousesQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}): UseQueryResult<Warehouse[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.masters.warehouses(),
    queryFn: listWarehouses,
    staleTime: options?.staleTime ?? 300000, // 5分
    enabled: options?.enabled ?? true,
  });
}

/**
 * 特定の製品を取得するフック
 *
 * @param productCode - 製品コード
 * @returns 製品のクエリ結果
 */
export function useProductQuery(
  productCode: string | undefined,
): UseQueryResult<Product | undefined, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.masters.product(productCode!),
    queryFn: async (): Promise<Product | undefined> => {
      const products = await listProducts();
      return products.find((p: Product) => p.product_code === productCode);
    },
    enabled: !!productCode,
    staleTime: 300000,
  });
}

/**
 * 特定の得意先を取得するフック
 *
 * @param customerCode - 得意先コード
 * @returns 得意先のクエリ結果
 */
export function useCustomerQuery(
  customerCode: string | undefined,
): UseQueryResult<Customer | undefined, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.masters.customer(customerCode!),
    queryFn: async (): Promise<Customer | undefined> => {
      const customers = await listCustomers();
      return customers.find((c: Customer) => c.customer_code === customerCode);
    },
    enabled: !!customerCode,
    staleTime: 300000,
  });
}

/**
 * 特定の倉庫を取得するフック
 *
 * @param warehouseCode - 倉庫コード
 * @returns 倉庫のクエリ結果
 */
export function useWarehouseQuery(
  warehouseCode: string | undefined,
): UseQueryResult<Warehouse | undefined, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.masters.warehouse(warehouseCode!),
    queryFn: async (): Promise<Warehouse | undefined> => {
      const warehouses = await listWarehouses();
      return warehouses.find((w: Warehouse) => w.warehouse_code === warehouseCode);
    },
    enabled: !!warehouseCode,
    staleTime: 300000,
  });
}

/**
 * 全マスタデータを一度に取得するフック
 * (ページ初期化時に使用)
 *
 * @returns 全マスタデータのクエリ結果
 *
 * @example
 * ```tsx
 * const {
 *   products,
 *   customers,
 *   warehouses,
 *   isLoading
 * } = useAllMastersQuery();
 * ```
 */
export function useAllMastersQuery() {
  const productsQuery = useProductsQuery();
  const customersQuery = useCustomersQuery();
  const warehousesQuery = useWarehousesQuery();

  return {
    products: productsQuery.data,
    customers: customersQuery.data,
    warehouses: warehousesQuery.data,
    isLoading: productsQuery.isLoading || customersQuery.isLoading || warehousesQuery.isLoading,
    isError: productsQuery.isError || customersQuery.isError || warehousesQuery.isError,
    error: productsQuery.error || customersQuery.error || warehousesQuery.error,
  };
}

/**
 * マスタデータから選択肢を生成するヘルパー関数
 */
export function createSelectOptions<T extends { code?: string; name?: string }>(
  items: T[] | undefined,
  getCode: (item: T) => string,
  getName: (item: T) => string,
) {
  if (!items) return [];

  return items.map((item) => ({
    value: getCode(item),
    label: `${getCode(item)} - ${getName(item)}`,
  }));
}

/**
 * 製品選択肢を生成
 */
export function useProductOptions() {
  const { data: products } = useProductsQuery();

  return createSelectOptions(
    products?.map((p) => ({
      code: p.product_code,
      name: p.product_name,
    })),
    (p: { code: string; name: string }) => p.code,
    (p: { code: string; name: string }) => p.name,
  );
}

/**
 * 得意先選択肢を生成
 */
export function useCustomerOptions() {
  const { data: customers } = useCustomersQuery();

  return createSelectOptions(
    customers?.map((c: Customer) => ({ code: c.customer_code, name: c.customer_name ?? "" })),
    (c: { code: string; name: string }) => c.code,
    (c: { code: string; name: string }) => c.name,
  );
}

/**
 * 倉庫選択肢を生成
 */
export function useWarehouseOptions() {
  const { data: warehouses } = useWarehousesQuery();

  return createSelectOptions(
    warehouses?.map((w: Warehouse) => ({ code: w.warehouse_code, name: w.warehouse_name })),
    (w: { code: string; name: string }) => w.code,
    (w: { code: string; name: string }) => w.name,
  );
}
