/**
 * Order Factory
 * 受注関連のテストデータ生成ファクトリー
 */

import { faker } from "@faker-js/faker/locale/ja";

import type { OrderLine, OrderResponse, OrderWithLinesResponse } from "@/shared/types/aliases";

type OrderLineFactoryExtras = {
  product_name?: string | null;
  customer_code?: string | null;
  customer_name?: string | null;
};

export type OrderLineFactoryResult = OrderLine & OrderLineFactoryExtras;

/**
 * ランダムな受注データを生成
 */
export function createOrder(overrides?: Partial<OrderResponse>): OrderResponse {
  const statuses = ["pending", "allocated", "shipped", "cancelled"] as const;

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    order_no: `ORD-${faker.string.alphanumeric(6).toUpperCase()}`,
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
export function createOrderLine(
  overrides?: Partial<OrderLineFactoryResult>,
): OrderLineFactoryResult {
  const quantity = overrides?.quantity ?? faker.number.int({ min: 1, max: 100 });
  const allocatedFromLots = Array.isArray(overrides?.allocated_lots)
    ? (overrides?.allocated_lots.reduce(
        (sum, allocation) => sum + (allocation.allocated_qty ?? 0),
        0,
      ) ?? 0)
    : 0;
  const defaultAllocated = Math.min(
    quantity,
    allocatedFromLots > 0 ? allocatedFromLots : faker.number.int({ min: 0, max: quantity }),
  );
  const allocatedQuantity = overrides?.allocated_qty ?? defaultAllocated;

  const explicitLineNo = overrides?.line_no ?? (overrides as { line_number?: number })?.line_number;
  const lineNo = explicitLineNo ?? faker.number.int({ min: 1, max: 999 });
  const unit = overrides?.unit ?? faker.helpers.arrayElement(["EA", "CASE", "BOX"]);

  const allocatedLots = Array.isArray(overrides?.allocated_lots)
    ? overrides.allocated_lots.map((lot) => ({
        ...lot,
        allocated_qty: lot.allocated_qty ?? 0,
      }))
    : [];

  const dueDate =
    overrides && "due_date" in overrides
      ? (overrides.due_date ?? null)
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
    line_no: lineNo,
    product_code: overrides?.product_code ?? `PRD-${faker.string.alphanumeric(4).toUpperCase()}`,
    quantity,
    unit,
    status: overrides?.status ?? faker.helpers.arrayElement(["open", "allocated", "shipped"]),
    due_date: dueDate,
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
          ? ((line.customer_code as string | null | undefined) ?? undefined)
          : (overrides?.customer_code ?? order.customer_code),
      customer_name:
        "customer_name" in line
          ? ((line.customer_name as string | null | undefined) ?? undefined)
          : ((overrides as { customer_name?: string | null })?.customer_name ??
            (order as { customer_name?: string | null }).customer_name ??
            undefined),
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
    allocated_qty: line.quantity,
    allocated_lots: (line.allocated_lots ?? []).map((lot) => ({
      ...lot,
      allocated_qty: lot.allocated_qty ?? line.quantity,
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
