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
    const productCode = url.searchParams.get("product_code");
    // const supplierCode = url.searchParams.get("supplier_code");
    const hasStock = url.searchParams.get("has_stock");

    let filteredLots = [...lots];

    // フィルタリング
    if (productCode) {
      filteredLots = filteredLots.filter((lot) => lot.product_code === productCode);
    }
    // supplier_code is not available in LotResponse, commenting out
    // if (supplierCode) {
    //   filteredLots = filteredLots.filter((lot) => lot.supplier_code === supplierCode);
    // }
    if (hasStock === "true") {
      filteredLots = filteredLots.filter((lot) => (lot.current_quantity ?? 0) > 0);
    }

    return HttpResponse.json(filteredLots);
  }),

  /**
   * GET /api/lots/:id - ロット詳細取得
   */
  http.get(`${API_BASE}/lots/:id`, ({ params }) => {
    const { id } = params;
    const lot = lots.find((l) => l.id === Number(id));

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
      id: Math.max(...lots.map((l) => l.id)) + 1,
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
    const index = lots.findIndex((l) => l.id === Number(id));

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
    const index = lots.findIndex((l) => l.id === Number(id));

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    lots.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
