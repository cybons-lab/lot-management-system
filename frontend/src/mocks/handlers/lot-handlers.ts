/**
 * MSW Handler - Lots
 * ロット関連のAPIモックハンドラー
 */

import { http, HttpResponse } from "msw";

import { createLots, createLotWithStock } from "@/factories/lot-factory";
import type { LotResponse } from "@/shared/types/aliases";

const API_BASE = "/api";

// メモリ上のロットデータ
const lots: LotResponse[] = createLots(20);

export const lotHandlers = [
  /**
   * GET /api/lots - ロット一覧取得
   */
  http.get(`${API_BASE}/lots`, ({ request }) => {
    const url = new URL(request.url);
    const productCode = url.searchParams.get("product_code"); // Note: API uses product_code but LotResponse has product_id
    // const supplierCode = url.searchParams.get("supplier_code");
    const hasStock = url.searchParams.get("has_stock");

    let filteredLots = [...lots];

    // フィルタリング
    // DDL v2.2: LotResponse has product_id (number), not product_code (string)
    // For mock data, we skip product_code filtering or use legacy field
    if (productCode && filteredLots[0] && "product_code" in filteredLots[0]) {
      filteredLots = filteredLots.filter(
        (lot) => (lot as { product_code?: string }).product_code === productCode,
      );
    }

    if (hasStock === "true") {
      // DDL v2.2: current_quantity is string (DECIMAL)
      filteredLots = filteredLots.filter((lot) => Number(lot.current_quantity ?? 0) > 0);
    }

    return HttpResponse.json(filteredLots);
  }),

  /**
   * GET /api/lots/:id - ロット詳細取得
   */
  http.get(`${API_BASE}/lots/:id`, ({ params }) => {
    const { id } = params;
    // DDL v2.2: LotResponse has lot_id, not id
    const lot = lots.find((l) => l.lot_id === Number(id));

    if (!lot) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(lot);
  }),

  /**
   * POST /api/lots - ロット作成
   */
  http.post(`${API_BASE}/lots`, async ({ request }) => {
    const body = (await request.json()) as Partial<LotResponse>;
    const newLot = createLotWithStock({
      ...body,
      // DDL v2.2: LotResponse has lot_id, not id
      lot_id: Math.max(...lots.map((l) => l.lot_id)) + 1,
    });

    lots.push(newLot);

    return HttpResponse.json(newLot, { status: 201 });
  }),

  /**
   * PUT /api/lots/:id - ロット更新
   */
  http.put(`${API_BASE}/lots/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<LotResponse>;
    // DDL v2.2: LotResponse has lot_id, not id
    const index = lots.findIndex((l) => l.lot_id === Number(id));

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    lots[index] = {
      ...lots[index],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(lots[index]);
  }),

  /**
   * DELETE /api/lots/:id - ロット削除
   */
  http.delete(`${API_BASE}/lots/:id`, ({ params }) => {
    const { id } = params;
    // DDL v2.2: LotResponse has lot_id, not id
    const index = lots.findIndex((l) => l.lot_id === Number(id));

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    lots.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
