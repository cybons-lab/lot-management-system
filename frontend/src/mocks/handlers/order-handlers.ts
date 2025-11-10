/**
 * MSW Handler - Orders
 * 受注関連のAPIモックハンドラー
 */

import { http, HttpResponse } from "msw";

import { createOrderWithLines } from "@/factories/order-factory";
import type { OrderResponse, OrderWithLinesResponse } from "@/shared/types/aliases";

const API_BASE = "/api";

// メモリ上の受注データ
const orders: OrderWithLinesResponse[] = Array.from({ length: 15 }, () => createOrderWithLines());

export const orderHandlers = [
  /**
   * GET /api/orders - 受注一覧取得
   */
  http.get(`${API_BASE}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const customerCode = url.searchParams.get("customer_code");

    let filteredOrders = [...orders];

    // フィルタリング
    if (status) {
      filteredOrders = filteredOrders.filter((order) => order.status === status);
    }
    if (customerCode) {
      filteredOrders = filteredOrders.filter((order) => order.customer_code === customerCode);
    }

    // 明細を除いた形式で返す
    const orderList: OrderResponse[] = filteredOrders.map(({ lines: _lines, ...order }) => order);

    return HttpResponse.json(orderList);
  }),

  /**
   * GET /api/orders/:id - 受注詳細取得（明細含む）
   */
  http.get(`${API_BASE}/orders/:id`, ({ params }) => {
    const { id } = params;
    const order = orders.find((o) => o.id === Number(id));

    if (!order) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(order);
  }),

  /**
   * POST /api/orders - 受注作成
   */
  http.post(`${API_BASE}/orders`, async ({ request }) => {
    const body = (await request.json()) as Partial<OrderWithLinesResponse>;
    const newOrder = createOrderWithLines(body.lines?.length || 1, {
      ...body,
      id: Math.max(...orders.map((o) => o.id)) + 1,
      status: "pending",
    });

    orders.push(newOrder);

    return HttpResponse.json(newOrder, { status: 201 });
  }),

  /**
   * PATCH /api/orders/:id/status - ステータス更新
   */
  http.patch(`${API_BASE}/orders/:id/status`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { new_status: string };
    const index = orders.findIndex((o) => o.id === Number(id));

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    orders[index] = {
      ...orders[index],
      status: body.new_status,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      order: orders[index],
    });
  }),

  /**
   * DELETE /api/orders/:id - 受注削除
   */
  http.delete(`${API_BASE}/orders/:id`, ({ params }) => {
    const { id } = params;
    const index = orders.findIndex((o) => o.id === Number(id));

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    orders.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
