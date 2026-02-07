/**
 * Lot Factory
 * ロット関連のテストデータ生成ファクトリー
 */

import { faker } from "@faker-js/faker/locale/ja";

import type { LotResponse } from "@/shared/types/aliases";

/**
 * ランダムなロットデータを生成 (DDL v2.2 compliant)
 */
export function createLot(overrides?: Partial<LotResponse>): LotResponse {
  const receivedDate = faker.date.recent({ days: 90 });
  const expiryDate = new Date(receivedDate);
  expiryDate.setDate(expiryDate.getDate() + faker.number.int({ min: 30, max: 365 }));

  const currentQty = faker.number.int({ min: 0, max: 1000 });
  const allocatedQty = faker.number.int({ min: 0, max: currentQty });

  const lotId = faker.number.int({ min: 1, max: 10000 });

  return {
    id: lotId, // Required for UI compatibility
    lot_id: lotId, // DDL v2.2
    lot_number: `LOT-${faker.string.alphanumeric(8).toUpperCase()}`,
    supplier_item_id: faker.number.int({ min: 1, max: 100 }), // DDL v2.2
    warehouse_id: faker.number.int({ min: 1, max: 10 }), // DDL v2.2
    supplier_id: faker.number.int({ min: 1, max: 50 }), // DDL v2.2
    received_date: receivedDate.toISOString().split("T")[0] ?? "", // DDL v2.2
    expiry_date: expiryDate.toISOString().split("T")[0] ?? "",
    current_quantity: String(currentQty), // DDL v2.2: DECIMAL as string
    received_quantity: String(currentQty), // DDL v2.2
    remaining_quantity: String(currentQty), // DDL v2.2
    available_quantity: String(currentQty), // Calculated: current - allocated - locked (assuming 0 allocated/locked for basic mock)
    reserved_quantity_active: "0",
    allocated_quantity: String(allocatedQty), // DDL v2.2: DECIMAL as string
    unit: faker.helpers.arrayElement(["EA", "CASE", "BOX"]),
    status: faker.helpers.arrayElement(["active", "depleted", "expired", "quarantine"]), // DDL v2.2
    locked_quantity: "0", // DDL v2.2
    lock_reason: null, // DDL v2.2
    expected_lot_id: null, // DDL v2.2

    // Inspection certificate fields
    inspection_status: "not_required",
    inspection_date: null,
    inspection_cert_number: null,

    // Origin tracking fields
    origin_type: "order" as const,
    origin_reference: null,

    // Required fields for LotResponse (extended type)
    product_name: faker.commerce.productName(),
    product_code: `PROD-${faker.string.alphanumeric(6).toUpperCase()}`,
    warehouse_name: "Main Warehouse",
    supplier_name: faker.company.name(),
    supplier_code: `SUP-${faker.string.alphanumeric(6).toUpperCase()}`,
    delivery_place_id: null,
    delivery_place_code: null,
    delivery_place_name: null,
    lot_no: null,
    is_assigned_supplier: false,

    product_deleted: false,
    warehouse_deleted: false,
    supplier_deleted: false,

    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
    current_quantity: String(faker.number.int({ min: 100, max: 1000 })),
    ...overrides,
  });
}

/**
 * 在庫切れロットを生成
 */
export function createLotWithoutStock(overrides?: Partial<LotResponse>): LotResponse {
  return createLot({
    current_quantity: "0",
    status: "depleted",
    ...overrides,
  });
}

/**
 * 期限切れロットを生成
 */
export function createExpiredLot(overrides?: Partial<LotResponse>): LotResponse {
  const expiryDate = faker.date.past();
  return createLot({
    expiry_date: expiryDate.toISOString().split("T")[0] ?? "",
    status: "expired",
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
    expiry_date: expiryDate.toISOString().split("T")[0] ?? "",
    ...overrides,
  });
}
