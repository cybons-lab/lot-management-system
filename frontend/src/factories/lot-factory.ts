/**
 * Lot Factory
 * ロット関連のテストデータ生成ファクトリー
 */

import { faker } from "@faker-js/faker/locale/ja";

import type { LotResponse } from "@/shared/types/aliases";

/**
 * ランダムなロットデータを生成
 */
export function createLot(overrides?: Partial<LotResponse>): LotResponse {
  const receiptDate = faker.date.recent({ days: 90 });
  const expiryDate = new Date(receiptDate);
  expiryDate.setDate(expiryDate.getDate() + faker.number.int({ min: 30, max: 365 }));

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    supplier_code: `SUP-${faker.string.alphanumeric(3).toUpperCase()}`,
    product_code: `PRD-${faker.string.alphanumeric(4).toUpperCase()}`,
    lot_number: `LOT-${faker.string.alphanumeric(8).toUpperCase()}`,
    receipt_date: receiptDate.toISOString().split("T")[0],
    expiry_date: expiryDate.toISOString().split("T")[0],
    warehouse_code: faker.helpers.arrayElement(["WH-A", "WH-B", "WH-C", null]),
    current_quantity: faker.number.int({ min: 0, max: 1000 }),
    updated_at: faker.date.recent().toISOString(),
    product_name: faker.commerce.productName(),
    unit: faker.helpers.arrayElement(["EA", "CASE", "BOX"]),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

/**
 * 複数のロットデータを生成
 */
export function createLots(count: number, overrides?: Partial<LotResponse>): LotResponse[] {
  return Array.from({ length: count }, () => createLot(overrides));
}

/**
 * 在庫があるロットを生成
 */
export function createLotWithStock(overrides?: Partial<LotResponse>): LotResponse {
  return createLot({
    current_quantity: faker.number.int({ min: 100, max: 1000 }),
    ...overrides,
  });
}

/**
 * 在庫切れロットを生成
 */
export function createLotWithoutStock(overrides?: Partial<LotResponse>): LotResponse {
  return createLot({
    current_quantity: 0,
    ...overrides,
  });
}

/**
 * 期限切れロットを生成
 */
export function createExpiredLot(overrides?: Partial<LotResponse>): LotResponse {
  const expiryDate = faker.date.past();
  return createLot({
    expiry_date: expiryDate.toISOString().split("T")[0],
    ...overrides,
  });
}

/**
 * 期限間近ロットを生成（残り30日以内）
 */
export function createExpiringLot(overrides?: Partial<LotResponse>): LotResponse {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + faker.number.int({ min: 1, max: 30 }));
  return createLot({
    expiry_date: expiryDate.toISOString().split("T")[0],
    ...overrides,
  });
}
