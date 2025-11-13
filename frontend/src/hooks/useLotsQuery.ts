/**
 * ロット取得用のカスタムフック（候補ロットAPI対応）
 */

import { useQuery } from "@tanstack/react-query";

import { getLots } from "@/features/inventory/api";
import type { CandidateLotItem } from "@/shared/types/aliases";

export interface UseLotsQueryParams {
  productId?: number | null;
  productCode?: string | null;
  deliveryPlaceCode?: string | null;
  supplierCode?: string | null;
  withStock?: boolean;
}

// 候補ロットの型定義（CandidateLotItem を拡張）
export interface Lot extends CandidateLotItem {
  id?: number; // lot_id のエイリアス
  warehouse_name?: string | null;
  current_stock?: {
    current_quantity: number;
  };
}

// レスポンスを配列に正規化（{items: []} / [] / {data: []} いずれでもOK）
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLots(res: unknown): CandidateLotItem[] {
  // 配列パターン
  if (Array.isArray(res)) return res as CandidateLotItem[];
  // { items: [] } パターン
  if (isObject(res)) {
    const items = (res as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items as CandidateLotItem[];
    }

    const data = (res as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as CandidateLotItem[];
    }
  }
  return [];
}

/**
 * 候補ロット一覧を取得
 * @param params 抽出条件
 */
export function useLotsQuery(params?: UseLotsQueryParams) {
  // Strengthen key validation: productId must be a positive finite number
  const hasLookupKey = Boolean(
    params &&
      ((typeof params.productId === "number" &&
        Number.isFinite(params.productId) &&
        params.productId > 0) ||
        !!params.productCode ||
        !!params.deliveryPlaceCode ||
        !!params.supplierCode),
  );

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.debug("useLotsQuery params:", params);
    console.debug("useLotsQuery hasLookupKey:", hasLookupKey);
  }

  return useQuery<Lot[], Error>({
    queryKey: [
      "lots",
      {
        productId: params?.productId,
        productCode: params?.productCode,
        deliveryPlaceCode: params?.deliveryPlaceCode,
        supplierCode: params?.supplierCode,
      },
    ],
    queryFn: async () => {
      const res = await getLots({
        ...(params?.productId != null ? { product_id: params.productId } : {}),
        ...(params?.productCode ? { product_code: params.productCode } : {}),
        ...(params?.supplierCode ? { supplier_code: params.supplierCode } : {}),
        ...(params?.deliveryPlaceCode ? { delivery_place_code: params.deliveryPlaceCode } : {}),
        with_stock: params?.withStock ?? true,
      });

      const lots = normalizeLots(res).map<Lot>((rawLot) => {
        const lot = rawLot as Lot;
        const normalizedCurrentQty = Number(
          lot.current_stock?.current_quantity ?? lot.current_quantity ?? 0,
        );

        return {
          ...lot,
          id: lot.lot_id ?? lot.id,
          current_stock: {
            current_quantity: normalizedCurrentQty,
          },
          current_quantity: normalizedCurrentQty,
          free_qty: Number(lot.free_qty ?? normalizedCurrentQty),
        };
      });

      return lots.filter((lot) => {
        if (params?.productId != null && lot.product_id != null) {
          return lot.product_id === params.productId;
        }
        if (params?.productCode) {
          return lot.product_code === params.productCode;
        }
        return true;
      });
    },
    enabled: hasLookupKey,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
