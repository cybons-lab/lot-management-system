/**
 * Query Keys
 * React Queryで使用するクエリキーの定義
 */

import type { LotSearchParams, OrderSearchParams } from '@/utils/validators';

const createMasterKeyFactory = <T extends string>(entity: T) => {
  const base = ['masters', entity] as const;
  const lists = () => [...base, 'list'] as const;
  const details = () => [...base, 'detail'] as const;

  return {
    all: base,
    lists,
    list: (params?: Record<string, unknown>) =>
      params ? ([...lists(), params] as const) : lists(),
    details,
    detail: (code: string) => [...details(), code] as const,
  } as const;
};

/**
 * ロット関連のクエリキー
 */
export const lotKeys = {
  all: ['lots'] as const,
  lists: () => [...lotKeys.all, 'list'] as const,
  list: (params?: LotSearchParams) => [...lotKeys.lists(), params] as const,
  details: () => [...lotKeys.all, 'detail'] as const,
  detail: (id: number) => [...lotKeys.details(), id] as const,
  withStock: () => [...lotKeys.lists(), { has_stock: true }] as const,
  byProduct: (productCode: string) => [...lotKeys.lists(), { product_code: productCode }] as const,
  bySupplier: (supplierCode: string) => [...lotKeys.lists(), { supplier_code: supplierCode }] as const,
};

/**
 * 受注関連のクエリキー
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrderSearchParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
  byStatus: (status: string) => [...orderKeys.lists(), { status }] as const,
  pending: () => [...orderKeys.byStatus('pending')] as const,
  allocated: () => [...orderKeys.byStatus('allocated')] as const,
  shipped: () => [...orderKeys.byStatus('shipped')] as const,
  byCustomer: (customerCode: string) => [...orderKeys.lists(), { customer_code: customerCode }] as const,
};

/**
 * マスタ関連のクエリキー
 */
export const masterKeys = {
  products: createMasterKeyFactory('products'),
  suppliers: createMasterKeyFactory('suppliers'),
  warehouses: createMasterKeyFactory('warehouses'),
  customers: createMasterKeyFactory('customers'),
} as const;

export const QUERY_KEYS = {
  lots: lotKeys,
  orders: orderKeys,
  masters: {
    products: () => masterKeys.products.list(),
    product: (code: string) => masterKeys.products.detail(code),
    customers: () => masterKeys.customers.list(),
    customer: (code: string) => masterKeys.customers.detail(code),
    warehouses: () => masterKeys.warehouses.list(),
    warehouse: (code: string) => masterKeys.warehouses.detail(code),
    suppliers: () => masterKeys.suppliers.list(),
    supplier: (code: string) => masterKeys.suppliers.detail(code),
  },
} as const;

/**
 * 全てのクエリキーをインバリデートするための配列
 */
export const allQueryKeys = [
  ...lotKeys.all,
  ...orderKeys.all,
  ...masterKeys.products.all,
  ...masterKeys.suppliers.all,
  ...masterKeys.warehouses.all,
  ...masterKeys.customers.all,
] as const;
