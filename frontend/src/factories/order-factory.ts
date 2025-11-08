/**
 * Order Factory
 * 受注関連のテストデータ生成ファクトリー
 */

import { faker } from "@faker-js/faker/locale/ja";
import type { OrderResponse, OrderLine, OrderWithLinesResponse } from "@/types/legacy";

/**
 * ランダムな受注データを生成
 */
export function createOrder(overrides?: Partial<OrderResponse>): OrderResponse {
  const statuses = ["pending", "allocated", "shipped", "cancelled"] as const;

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    order_number: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
    order_date: faker.date.recent({ days: 30 }).toISOString().split("T")[0],
    customer_code: `CUST-${faker.string.alphanumeric(4).toUpperCase()}`,
    customer_name: faker.company.name(),
    status: faker.helpers.arrayElement(statuses),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * 受注明細を生成
 */
export function createOrderLine(overrides?: Partial<OrderLine>): OrderLine {
  const quantity = faker.number.int({ min: 1, max: 100 });
  const allocatedQuantity = faker.number.int({ min: 0, max: quantity });

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    order_id: faker.number.int({ min: 1, max: 1000 }),
    line_number: faker.number.int({ min: 1, max: 10 }),
    product_code: `PRD-${faker.string.alphanumeric(4).toUpperCase()}`,
    quantity,
    unit: faker.helpers.arrayElement(["EA", "CASE", "BOX"]),
    allocated_quantity: allocatedQuantity,
    ...overrides,
  };
}

/**
 * 受注と明細を含む完全なデータを生成
 */
export function createOrderWithLines(
  lineCount: number = 3,
  overrides?: Partial<OrderWithLinesResponse>,
): OrderWithLinesResponse {
  const order = createOrder(overrides);
  const lines = Array.from({ length: lineCount }, (_, index) =>
    createOrderLine({
      order_id: order.id,
      line_number: index + 1,
    }),
  );

  return {
    ...order,
    lines,
    ...overrides,
  };
}

/**
 * 複数の受注データを生成
 */
export function createOrders(count: number, overrides?: Partial<OrderResponse>): OrderResponse[] {
  return Array.from({ length: count }, () => createOrder(overrides));
}

/**
 * 保留中の受注を生成
 */
export function createPendingOrder(
  overrides?: Partial<OrderWithLinesResponse>,
): OrderWithLinesResponse {
  return createOrderWithLines(3, {
    status: "pending",
    ...overrides,
  });
}

/**
 * 引当済みの受注を生成
 */
export function createAllocatedOrder(
  overrides?: Partial<OrderWithLinesResponse>,
): OrderWithLinesResponse {
  const order = createOrderWithLines(3, {
    status: "allocated",
    ...overrides,
  });

  // 全明細の allocated_quantity を quantity と同じにする
  order.lines = order.lines.map((line) => ({
    ...line,
    allocated_quantity: line.quantity,
  }));

  return order;
}

/**
 * 出荷済みの受注を生成
 */
export function createShippedOrder(
  overrides?: Partial<OrderWithLinesResponse>,
): OrderWithLinesResponse {
  return createOrderWithLines(3, {
    status: "shipped",
    ...overrides,
  });
}

/**
 * キャンセル済みの受注を生成
 */
export function createCancelledOrder(
  overrides?: Partial<OrderWithLinesResponse>,
): OrderWithLinesResponse {
  return createOrderWithLines(3, {
    status: "cancelled",
    ...overrides,
  });
}
