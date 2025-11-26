/**
 * Master Factory
 * マスタデータ関連のテストデータ生成ファクトリー
 */

import { faker } from "@faker-js/faker/locale/ja";

import type { Product, Supplier, Warehouse } from "@/shared/types/aliases";

/**
 * ランダムな製品データを生成
 */
export function createProduct(overrides?: Partial<Product>): Product {
  return {
    product_code: `PRD-${faker.string.alphanumeric(4).toUpperCase()}`,
    product_name: faker.commerce.productName(),
    ...overrides,
  };
}

/**
 * 複数の製品データを生成
 */
export function createProducts(count: number, overrides?: Partial<Product>): Product[] {
  return Array.from({ length: count }, () => createProduct(overrides));
}

/**
 * ランダムな仕入先データを生成
 */
export function createSupplier(overrides?: Partial<Supplier>): Supplier {
  return {
    supplier_code: `SUP-${faker.string.alphanumeric(3).toUpperCase()}`,
    supplier_name: faker.company.name(),
    contact_name: faker.person.fullName(),
    ...overrides,
  };
}

/**
 * 複数の仕入先データを生成
 */
export function createSuppliers(count: number, overrides?: Partial<Supplier>): Supplier[] {
  return Array.from({ length: count }, () => createSupplier(overrides));
}

/**
 * ランダムな倉庫データを生成
 */
export function createWarehouse(overrides?: Partial<Warehouse>): Warehouse {
  const cities = ["東京", "大阪", "名古屋", "福岡", "札幌", "仙台"];
  const city = faker.helpers.arrayElement(cities);

  return {
    warehouse_code: `WH-${city.charAt(0)}${faker.number.int({ min: 1, max: 99 })}`,
    warehouse_name: `${city}倉庫`,
    address: faker.location.streetAddress({ useFullAddress: true }),
    is_active: faker.helpers.arrayElement([true, false]),
    ...overrides,
  };
}

/**
 * 複数の倉庫データを生成
 */
export function createWarehouses(count: number, overrides?: Partial<Warehouse>): Warehouse[] {
  return Array.from({ length: count }, () => createWarehouse(overrides));
}

/**
 * 有効な倉庫を生成
 */
export function createActiveWarehouse(overrides?: Partial<Warehouse>): Warehouse {
  return createWarehouse({
    is_active: true,
    ...overrides,
  });
}

/**
 * 無効な倉庫を生成
 */
export function createInactiveWarehouse(overrides?: Partial<Warehouse>): Warehouse {
  return createWarehouse({
    is_active: false,
    ...overrides,
  });
}
