/**
 * Order Factory
 * 受注関連のテストデータ生成ファクトリー
 */

// Utility to convert null to undefined
const nullToUndefined = <T>(value: T | null | undefined): T | undefined =>
  value === null ? undefined : value;

import { faker } from "@faker-js/faker/locale/ja";

import { coerceAllocatedLots } from "@/shared/libs/allocations";
import type { OrderLine, OrderResponse, OrderWithLinesResponse } from "@/shared/types/aliases";

type OrderLineFactoryExtras = {
  product_name?: string | null;
  customer_code?: string | null;
  customer_name?: string | null;
  order_id?: number;
  allocated_quantity?: number | string | null;
};

export type OrderLineFactoryResult = OrderLine & OrderLineFactoryExtras;

/**
 * ランダムな受注データを生成 (DDL v2.2 compliant)
 */
export function createOrder(overrides?: Partial<OrderResponse>): OrderResponse {
  const statuses = ["pending", "allocated", "shipped", "cancelled"] as const;

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    order_number: `ORD-${faker.string.alphanumeric(6).toUpperCase()}`, // DDL v2.2
    order_date: faker.date.recent({ days: 30 }).toISOString().split("T")[0],
    customer_id: faker.number.int({ min: 1, max: 100 }), // DDL v2.2: FK to customers
    delivery_place_id: faker.number.int({ min: 1, max: 10 }), // DDL v2.2: required
    status: faker.helpers.arrayElement(statuses),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    // Legacy fields for backward compatibility
    order_no: overrides?.order_no ?? `ORD-${faker.string.alphanumeric(6).toUpperCase()}`,
    customer_code: overrides?.customer_code ?? `CUST-${faker.string.alphanumeric(4).toUpperCase()}`,
    customer_name: overrides?.customer_name ?? faker.company.name(),
    ...overrides,
  };
}

/**
 * 受注明細を生成 (DDL v2.2 compliant)
 */
export function createOrderLine(
  overrides?: Partial<OrderLineFactoryResult>,
): OrderLineFactoryResult {
  const orderQuantity =
    overrides?.order_quantity ?? overrides?.quantity ?? faker.number.int({ min: 1, max: 100 });

  const allocatedLots = coerceAllocatedLots(overrides?.allocated_lots);

  const allocatedFromLots = allocatedLots.reduce(
    (sum, allocation) =>
      sum + Number(allocation.allocated_quantity ?? allocation.allocated_qty ?? 0),
    0,
  );
  const defaultAllocated = Math.min(
    Number(orderQuantity),
    allocatedFromLots > 0
      ? allocatedFromLots
      : faker.number.int({ min: 0, max: Number(orderQuantity) }),
  );
  const allocatedQuantity =
    overrides?.allocated_quantity ?? overrides?.allocated_qty ?? String(defaultAllocated);

  const unit = overrides?.unit ?? faker.helpers.arrayElement(["EA", "CASE", "BOX"]);

  const deliveryDate =
    overrides && "delivery_date" in overrides && overrides.delivery_date !== null
      ? overrides.delivery_date
      : overrides && "due_date" in overrides && overrides.due_date !== null
        ? overrides.due_date
        : faker.date.soon({ days: 30 }).toISOString().split("T")[0];

  const productName =
    overrides && "product_name" in overrides
      ? (overrides.product_name ?? undefined)
      : faker.commerce.productName();
  const customerCode =
    overrides && "customer_code" in overrides ? (overrides.customer_code ?? undefined) : undefined;
  const customerName =
    overrides && "customer_name" in overrides ? (overrides.customer_name ?? undefined) : undefined;

  return {
    id: overrides?.id ?? faker.number.int({ min: 1, max: 10000 }),
    order_id: overrides?.order_id ?? faker.number.int({ min: 1, max: 10000 }), // DDL v2.2
    product_id: overrides?.product_id ?? faker.number.int({ min: 1, max: 100 }), // DDL v2.2
    order_quantity: String(orderQuantity), // DDL v2.2: DECIMAL as string
    unit,
    delivery_date: deliveryDate ?? faker.date.soon({ days: 30 }).toISOString().split("T")[0], // DDL v2.2
    created_at: faker.date.past().toISOString(), // DDL v2.2
    updated_at: faker.date.recent().toISOString(), // DDL v2.2
    // Legacy fields for backward compatibility
    line_no:
      overrides?.line_no ??
      (overrides as { line_number?: number })?.line_number ??
      faker.number.int({ min: 1, max: 999 }),
    product_code: overrides?.product_code ?? `PRD-${faker.string.alphanumeric(4).toUpperCase()}`,
    quantity: overrides?.quantity ?? orderQuantity,
    status: overrides?.status ?? faker.helpers.arrayElement(["open", "allocated", "shipped"]),
    due_date:
      overrides?.due_date ??
      deliveryDate ??
      faker.date.soon({ days: 30 }).toISOString().split("T")[0],
    allocated_qty: overrides?.allocated_qty ?? allocatedQuantity,
    forecast_qty: overrides?.forecast_qty ?? null,
    forecast_version_no: overrides?.forecast_version_no ?? null,
    allocated_lots: allocatedLots,
    product_name: productName,
    customer_code: customerCode ?? undefined,
    customer_name: customerName ?? undefined,
  };
}

/**
 * 受注と明細を含む完全なデータを生成
 */
export function createOrderWithLines(
  lineCount: number = 3,
  overrides?: Partial<OrderWithLinesResponse> & {
    lines?: Array<Partial<OrderLineFactoryResult>>;
  },
): OrderWithLinesResponse & { lines: OrderLineFactoryResult[] } {
  const order = createOrder(overrides);

  const baseLines = overrides?.lines?.length
    ? overrides.lines
    : Array.from({ length: lineCount }, (_, index) => ({ line_no: index + 1 }));

  const lines = baseLines.map((line, index) =>
    createOrderLine({
      line_no:
        (line as { line_no?: number })?.line_no ??
        (line as { line_number?: number })?.line_number ??
        index + 1,
      id: "id" in line ? (line.id as number) : index + 1,
      ...line,
      customer_code:
        "customer_code" in line
          ? nullToUndefined(line.customer_code as string | null | undefined)
          : nullToUndefined(overrides?.customer_code ?? order.customer_code),
      customer_name:
        "customer_name" in line
          ? nullToUndefined(line.customer_name as string | null | undefined)
          : nullToUndefined(
              (overrides as { customer_name?: string | null })?.customer_name ??
                (order as { customer_name?: string | null }).customer_name,
            ),
    }),
  );

  return {
    ...order,
    ...overrides,
    lines,
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

  order.lines = (order.lines ?? []).map((line) => ({
    ...line,
    allocated_quantity: line.order_quantity, // DDL v2.2
    allocated_qty: line.order_quantity, // Legacy
    allocated_lots: coerceAllocatedLots(line.allocated_lots).map((lot) => ({
      ...lot,
      allocated_quantity: lot.allocated_quantity ?? lot.allocated_qty ?? line.order_quantity, // DDL v2.2
      allocated_qty: Number(lot.allocated_quantity ?? lot.allocated_qty ?? line.order_quantity), // Legacy
    })),
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
