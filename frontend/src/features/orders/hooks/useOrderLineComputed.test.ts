import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import {
  useOrderLineComputed,
  type OrderLineSource,
  type OrderSource,
} from "./useOrderLineComputed";

describe("useOrderLineComputed", () => {
  const mockOrderLine: OrderLineSource = {
    id: 101,
    order_id: 1,
    product_id: 10,
    product_code: "PRD-001",
    product_name: "テスト製品",
    quantity: 100,
    unit: "KG",
    status: "pending",
    customer_code: "CUST-001",
    customer_name: "テスト顧客",
    order_date: "2025-01-01",
    due_date: "2025-01-15",
    ship_date: null,
    planned_ship_date: "2025-01-10",
    allocated_lots: [],
    delivery_places: [],
  };

  const mockOrder: OrderSource = {
    id: 1,
    customer_id: 100,
    customer_code: "CUST-ORDER",
    customer_name: "注文顧客",
    order_date: "2025-01-01",
    status: "open",
  };

  describe("基本的なID処理", () => {
    it("lineIdとorderIdが正しく設定される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine, mockOrder));

      expect(result.current.lineId).toBe(101);
      expect(result.current.orderId).toBe(1);
      expect(result.current.ids.lineId).toBe(101);
      expect(result.current.ids.orderId).toBe(1);
    });

    it("orderが提供されない場合もline.order_idを使用する", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine));

      expect(result.current.orderId).toBe(1);
    });

    it("lineがnullの場合はundefinedを返す", () => {
      const { result } = renderHook(() => useOrderLineComputed(null));

      expect(result.current.lineId).toBeUndefined();
      expect(result.current.orderId).toBeUndefined();
    });
  });

  describe("製品情報", () => {
    it("製品コードと名前が正しく設定される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine));

      expect(result.current.productId).toBe(10);
      expect(result.current.productCode).toBe("PRD-001");
      expect(result.current.productName).toBe("テスト製品");
    });

    it("製品情報がない場合はnullまたは空文字", () => {
      const { result } = renderHook(() => useOrderLineComputed({}));

      expect(result.current.productId).toBeNull();
      expect(result.current.productCode).toBeNull();
      expect(result.current.productName).toBe("");
    });
  });

  describe("顧客情報", () => {
    it("lineの顧客情報が優先される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine, mockOrder));

      expect(result.current.customerCode).toBe("CUST-001");
      expect(result.current.customerName).toBe("テスト顧客");
    });

    it("lineに顧客情報がない場合はorderから取得", () => {
      const lineWithoutCustomer: OrderLineSource = { ...mockOrderLine };
      delete lineWithoutCustomer.customer_code;
      delete lineWithoutCustomer.customer_name;

      const { result } = renderHook(() => useOrderLineComputed(lineWithoutCustomer, mockOrder));

      expect(result.current.customerCode).toBe("CUST-ORDER");
      expect(result.current.customerName).toBe("注文顧客");
    });

    it("customerIdはorderから取得", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine, mockOrder));

      expect(result.current.customerId).toBe(100);
    });
  });

  describe("数量計算", () => {
    it("引当なしの場合は残数量が全量", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine));

      expect(result.current.totalQty).toBe(100);
      expect(result.current.allocatedTotal).toBe(0);
      expect(result.current.remainingQty).toBe(100);
      expect(result.current.progressPct).toBe(0);
    });

    it("部分引当の場合の計算が正しい", () => {
      const lineWithAllocation: OrderLineSource = {
        ...mockOrderLine,
        allocated_lots: [
          { lot_id: 1, allocated_qty: 30 },
          { lot_id: 2, allocated_qty: 20 },
        ],
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithAllocation));

      expect(result.current.totalQty).toBe(100);
      expect(result.current.allocatedTotal).toBe(50);
      expect(result.current.remainingQty).toBe(50);
      expect(result.current.progressPct).toBe(50);
    });

    it("全量引当の場合は残数量が0", () => {
      const lineWithFullAllocation: OrderLineSource = {
        ...mockOrderLine,
        allocated_lots: [{ lot_id: 1, allocated_qty: 100 }],
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithFullAllocation));

      expect(result.current.remainingQty).toBe(0);
      expect(result.current.progressPct).toBe(100);
    });

    it("過剰引当でも残数量は0以上", () => {
      const lineWithOverAllocation: OrderLineSource = {
        ...mockOrderLine,
        allocated_lots: [{ lot_id: 1, allocated_qty: 150 }],
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithOverAllocation));

      expect(result.current.remainingQty).toBe(0);
      expect(result.current.progressPct).toBe(150); // 過剰引当は100%超え
    });

    it("数量が0の場合のprogressPctは0", () => {
      const lineWithZeroQty: OrderLineSource = {
        ...mockOrderLine,
        quantity: 0,
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithZeroQty));

      expect(result.current.progressPct).toBe(0);
    });
  });

  describe("ステータス", () => {
    it("lineのステータスが優先される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine, mockOrder));

      expect(result.current.status).toBe("pending");
    });

    it("lineにステータスがない場合はorderのステータス", () => {
      const lineWithoutStatus: OrderLineSource = { ...mockOrderLine };
      delete lineWithoutStatus.status;

      const { result } = renderHook(() => useOrderLineComputed(lineWithoutStatus, mockOrder));

      expect(result.current.status).toBe("open");
    });

    it("両方にステータスがない場合はdraft", () => {
      const { result } = renderHook(() => useOrderLineComputed({}));

      expect(result.current.status).toBe("draft");
    });
  });

  describe("日付情報", () => {
    it("日付フィールドが正しく設定される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine));

      expect(result.current.orderDate).toBe("2025-01-01");
      expect(result.current.dueDate).toBe("2025-01-15");
      expect(result.current.shipDate).toBeNull();
      expect(result.current.plannedShipDate).toBe("2025-01-10");
    });

    it("shippingLeadTimeが計算される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine));

      // due_date: 2025-01-15, planned_ship_date: 2025-01-10 → 5日
      expect(result.current.shippingLeadTime).toBe("5日");
    });

    it("出荷日が期限を過ぎた場合は遅延表示", () => {
      const lineWithDelay: OrderLineSource = {
        ...mockOrderLine,
        due_date: "2025-01-10",
        planned_ship_date: "2025-01-15",
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithDelay));

      expect(result.current.shippingLeadTime).toBe("遅延5日");
    });
  });

  describe("単位", () => {
    it("明細の単位が使用される", () => {
      const { result } = renderHook(() => useOrderLineComputed(mockOrderLine));

      expect(result.current.unit).toBe("KG");
    });

    it("単位がない場合はEAがデフォルト", () => {
      const lineWithoutUnit: OrderLineSource = { ...mockOrderLine };
      delete lineWithoutUnit.unit;

      const { result } = renderHook(() => useOrderLineComputed(lineWithoutUnit));

      expect(result.current.unit).toBe("EA");
    });
  });

  describe("納品先情報", () => {
    it("delivery_placesが正しく設定される", () => {
      const lineWithDeliveryPlaces: OrderLineSource = {
        ...mockOrderLine,
        delivery_places: ["東京倉庫", "大阪倉庫"],
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithDeliveryPlaces));

      expect(result.current.deliveryPlaces).toContain("東京倉庫");
      expect(result.current.deliveryPlaces).toContain("大阪倉庫");
    });

    it("allocation内の納品先も含まれる", () => {
      const lineWithAllocationDelivery: OrderLineSource = {
        ...mockOrderLine,
        allocated_lots: [
          {
            lot_id: 1,
            allocated_qty: 50,
            delivery_place_code: "DP-001",
            delivery_place_name: "配送先A",
          },
        ],
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithAllocationDelivery));

      expect(result.current.deliveryPlaces.length).toBeGreaterThan(0);
    });

    it("重複する納品先は除去される", () => {
      const lineWithDuplicates: OrderLineSource = {
        ...mockOrderLine,
        delivery_places: ["東京倉庫", "東京倉庫", "大阪倉庫"],
      };

      const { result } = renderHook(() => useOrderLineComputed(lineWithDuplicates));

      const uniqueCount = new Set(result.current.deliveryPlaces).size;
      expect(result.current.deliveryPlaces.length).toBe(uniqueCount);
    });
  });
});
