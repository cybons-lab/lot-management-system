import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useLotFilters, type LotFilterValues } from "./useLotFilters";

import type { LotUI } from "@/shared/libs/normalize";

// テスト用のモックロットデータ
const mockLots: LotUI[] = [
  {
    id: 1,
    lot_id: 1,
    lot_number: "LOT-001",
    maker_part_no: null,
    customer_part_no: null,
    supplier_item_id: 10,
    product_code: "PRD-A",
    product_name: "製品A",
    warehouse_id: 1,
    warehouse_code: "WH-01",
    warehouse_name: "倉庫1",
    supplier_id: 1,
    supplier_code: "SUP-01",
    supplier_name: "仕入先1",
    current_quantity: "100.000",
    allocated_quantity: "20.000",
    locked_quantity: "0.000",
    available_quantity: "80.000",
    unit: "KG",
    status: "active",
    received_date: "2025-01-01",
    expiry_date: "2025-12-31",
    lock_reason: null,
    expected_lot_id: null,
    inspection_status: "not_required",
    inspection_date: null,
    inspection_cert_number: null,
    days_to_expiry: 365,
    primary_user_id: null,
    primary_username: null,
    primary_user_display_name: null,
    product_deleted: false,
    warehouse_deleted: false,
    supplier_deleted: false,
    origin_type: "adhoc",
    origin_reference: null,
    order_no: null,
    shipping_date: null,
    cost_price: null,
    selling_price: null,
    sales_price: null,
    tax_rate: null,
    customer_name: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    lot_id: 2,
    lot_number: "LOT-002",
    maker_part_no: null,
    customer_part_no: null,
    supplier_item_id: 20,
    product_code: "PRD-B",
    product_name: "製品B",
    warehouse_id: 1,
    warehouse_code: "WH-01",
    warehouse_name: "倉庫1",
    supplier_id: 2,
    supplier_code: "SUP-02",
    supplier_name: "仕入先2",
    current_quantity: "0.000",
    allocated_quantity: "0.000",
    locked_quantity: "0.000",
    available_quantity: "0.000",
    unit: "KG",
    status: "depleted",
    received_date: "2025-01-01",
    expiry_date: "2025-06-30",
    lock_reason: null,
    expected_lot_id: null,
    inspection_status: "not_required",
    inspection_date: null,
    inspection_cert_number: null,
    days_to_expiry: 180,
    primary_user_id: null,
    primary_username: null,
    primary_user_display_name: null,
    product_deleted: false,
    warehouse_deleted: false,
    supplier_deleted: false,
    origin_type: "adhoc",
    origin_reference: null,
    order_no: null,
    shipping_date: null,
    cost_price: null,
    selling_price: null,
    sales_price: null,
    tax_rate: null,
    customer_name: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 3,
    lot_id: 3,
    lot_number: "LOT-003",
    maker_part_no: null,
    customer_part_no: null,
    supplier_item_id: 10,
    product_code: "PRD-A",
    product_name: "製品A",
    warehouse_id: 2,
    warehouse_code: "WH-02",
    warehouse_name: "倉庫2",
    supplier_id: 1,
    supplier_code: "SUP-01",
    supplier_name: "仕入先1",
    current_quantity: "50.000",
    allocated_quantity: "10.000",
    locked_quantity: "5.000",
    available_quantity: "35.000",
    unit: "KG",
    status: "active",
    received_date: "2025-02-01",
    expiry_date: "",
    lock_reason: "品質検査中",
    expected_lot_id: null,
    inspection_status: "pending",
    inspection_date: null,
    inspection_cert_number: null,
    days_to_expiry: null,
    primary_user_id: null,
    primary_username: null,
    primary_user_display_name: null,
    product_deleted: false,
    warehouse_deleted: false,
    supplier_deleted: false,
    origin_type: "adhoc",
    origin_reference: null,
    order_no: null,
    shipping_date: null,
    cost_price: null,
    selling_price: null,
    sales_price: null,
    tax_rate: null,
    customer_name: null,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
  },
];

const defaultFilters: LotFilterValues = {
  search: "",
  product_code: "",
  delivery_place_code: "",
  status: "all",
  hasStock: false,
};

describe("useLotFilters", () => {
  describe("検索フィルター", () => {
    it("ロット番号で検索できる", () => {
      const filters: LotFilterValues = { ...defaultFilters, search: "LOT-001" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]!.lot_number).toBe("LOT-001");
    });

    it("製品コードで検索できる", () => {
      const filters: LotFilterValues = { ...defaultFilters, search: "PRD-A" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((lot) => lot.product_code === "PRD-A")).toBe(true);
    });

    it("製品名で検索できる（部分一致）", () => {
      const filters: LotFilterValues = { ...defaultFilters, search: "製品B" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]!.product_name).toBe("製品B");
    });

    it("大文字小文字を区別しない", () => {
      const filters: LotFilterValues = { ...defaultFilters, search: "lot-001" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]!.lot_number).toBe("LOT-001");
    });

    it("検索条件が空の場合は全件返す", () => {
      const filters: LotFilterValues = { ...defaultFilters, search: "" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(3);
    });
  });

  describe("製品コードフィルター", () => {
    it("製品コードで絞り込める", () => {
      const filters: LotFilterValues = { ...defaultFilters, product_code: "PRD-A" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((lot) => lot.product_code === "PRD-A")).toBe(true);
    });

    it("存在しない製品コードでは0件", () => {
      const filters: LotFilterValues = { ...defaultFilters, product_code: "PRD-X" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(0);
    });
  });

  describe("ステータスフィルター", () => {
    it("'all'の場合は全件返す", () => {
      const filters: LotFilterValues = { ...defaultFilters, status: "all" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(3);
    });

    it("'active'の場合は在庫ありのみ返す", () => {
      const filters: LotFilterValues = { ...defaultFilters, status: "active" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((lot) => Number(lot.current_quantity) > 0)).toBe(true);
    });

    it("'inactive'の場合は在庫なしのみ返す", () => {
      const filters: LotFilterValues = { ...defaultFilters, status: "inactive" };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]!.lot_number).toBe("LOT-002");
    });
  });

  describe("在庫ありフィルター", () => {
    it("hasStockがtrueの場合は在庫ありのみ返す", () => {
      const filters: LotFilterValues = { ...defaultFilters, hasStock: true };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((lot) => Number(lot.current_quantity) > 0)).toBe(true);
    });

    it("hasStockがfalseの場合は全件返す", () => {
      const filters: LotFilterValues = { ...defaultFilters, hasStock: false };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(3);
    });
  });

  describe("複合フィルター", () => {
    it("検索 + ステータスで絞り込める", () => {
      const filters: LotFilterValues = {
        ...defaultFilters,
        search: "PRD-A",
        status: "active",
      };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((lot) => lot.product_code === "PRD-A")).toBe(true);
      expect(result.current.every((lot) => Number(lot.current_quantity) > 0)).toBe(true);
    });

    it("製品コード + 在庫ありで絞り込める", () => {
      const filters: LotFilterValues = {
        ...defaultFilters,
        product_code: "PRD-B",
        hasStock: true,
      };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      // PRD-Bは在庫なしなので0件になる
      expect(result.current).toHaveLength(0);
    });

    it("全条件を組み合わせて絞り込める", () => {
      const filters: LotFilterValues = {
        ...defaultFilters,
        search: "製品A",
        product_code: "PRD-A",
        status: "active",
        hasStock: true,
      };
      const { result } = renderHook(() => useLotFilters(mockLots, filters));

      expect(result.current).toHaveLength(2);
    });
  });

  describe("空配列の処理", () => {
    it("空配列の場合は空配列を返す", () => {
      const { result } = renderHook(() => useLotFilters([], defaultFilters));

      expect(result.current).toHaveLength(0);
    });
  });
});
