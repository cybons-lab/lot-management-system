/**
 * ロット取得用のカスタムフック（候補ロットAPI対応）
 */

import { useQuery } from "@tanstack/react-query";

import { getLots } from "@/features/inventory/api";
import type { CandidateLotItem } from "@/shared/types/aliases";

// 候補ロットの型定義（CandidateLotItem を拡張）
export interface Lot extends CandidateLotItem {
  id?: number; // lot_id のエイリアス
  warehouse_name?: string | null;
  current_stock?: {
    current_quantity: number;
  };
}

// レスポンスを配列に正規化（{items: []} / [] / {data: []} いずれでもOK）
function normalizeLots(res: unknown): CandidateLotItem[] {
  // 配列パターン
  if (Array.isArray(res)) return res as CandidateLotItem[];
  // { items: [] } パターン
  if (res && typeof res === "object" && "items" in (res as any)) {
    return ((res as any).items ?? []) as CandidateLotItem[];
  }
  // { data: [] }（fetchラッパによってはこの形）
  if (res && typeof res === "object" && "data" in (res as any)) {
    const d = (res as any).data;
    return Array.isArray(d) ? (d as CandidateLotItem[]) : [];
  }
  return [];
}

/**
 * 候補ロット一覧を取得
 * @param productId 商品ID（必須）
 * @param warehouseId 倉庫ID（オプション）
 */
export function useLotsQuery(productKey?: string, warehouseKey?: string) {
  return useQuery<CandidateLotItem[], Error>({
    queryKey: ["lots", productKey, warehouseKey],
    queryFn: async () => {
      const res = await getLots({
        product_code: productKey!, // ← パラメータ名をAPIに合わせる
        warehouse_code: warehouseKey!, // ← 同上
        with_stock: true,
      });
      return normalizeLots(res);
    },
    enabled: !!productKey && !!warehouseKey,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
