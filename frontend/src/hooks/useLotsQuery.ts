/**
 * ロット取得用のカスタムフック（候補ロットAPI対応）
 */

import { useQuery } from "@tanstack/react-query";

import { getCandidateLots } from "@/features/orders/api";
import type { CandidateLotItem } from "@/shared/types/aliases";

// 候補ロットの型定義（CandidateLotItem を拡張）
export interface Lot extends CandidateLotItem {
  id?: number; // lot_id のエイリアス
  warehouse_name?: string | null;
  current_stock?: {
    current_quantity: number;
  };
}

/**
 * 候補ロット一覧を取得
 * @param productId 商品ID（必須）
 * @param warehouseId 倉庫ID（オプション）
 */
export const useLotsQuery = (productId?: number, warehouseId?: number) => {
  return useQuery({
    queryKey: ["candidate-lots", productId, warehouseId],
    queryFn: async () => {
      if (!productId) return [];

      const response = await getCandidateLots({
        product_id: productId,
        warehouse_id: warehouseId,
        limit: 200,
      });

      // レスポンスを Lot 型に変換
      const lots: Lot[] = (response.items ?? []).map((item) => ({
        ...item,
        id: item.lot_id, // id エイリアス
        current_stock: {
          current_quantity: item.free_qty, // free_qty を使用
        },
      }));

      return lots;
    },
    enabled: !!productId, // 商品IDがある場合のみクエリを実行
  });
};
