/**
 * useLotFilters.ts
 *
 * ロット一覧のクライアントサイドフィルタリングロジック
 *
 * 【設計意図】なぜクライアントサイドでフィルタリングするのか:
 *
 * 1. パフォーマンス最適化
 *    理由: ロット一覧は全件取得してキャッシュ（staleTime: 5分）
 *    → フィルター変更のたびにAPI呼び出しすると、サーバー負荷が増大
 *    → クライアント側でフィルタリングすれば、即座に結果を表示できる
 *    例: 検索キーワードを1文字ずつ入力する度にAPIを叩くと、数十回のリクエスト
 *    → クライアント側なら、タイピング中もリアルタイムで結果が更新される
 *
 * 2. ユーザー体験の向上
 *    理由: フィルター変更時にローディング状態が発生しない
 *    → ユーザーは瞬時にフィルター結果を確認できる
 *    → 「検索中...」のスピナー表示が不要
 *
 * 3. サーバーサイドフィルタリングとの使い分け
 *    使い分け基準:
 *    - データ量が少ない（数百件程度）: クライアントサイド
 *    - データ量が多い（数千件以上）: サーバーサイド + ページネーション
 *    現状: ロット数は数百件程度を想定 → クライアントサイドが適切
 *    将来対応: データ量増加時は、バックエンドにフィルターAPIを追加
 *
 * 4. useMemo による再計算の最適化
 *    理由: フィルター結果をメモ化
 *    → lots または filters が変わらない限り、再計算しない
 *    → レンダリングごとに filter() を実行しない
 *    メリット: 大量のロット（100件以上）でもスムーズに動作
 *
 * 5. 関数分割による可読性向上
 *    構成:
 *    - matchesSearch: 検索キーワードマッチング
 *    - matchesStatus: ステータスマッチング
 *    - matchesFilter: 全フィルター条件の統合
 *    メリット: 各条件が独立してテスト可能、コードが理解しやすい
 */

import { useMemo } from "react";

import type { LotUI } from "@/shared/libs/normalize";
import { parseDecimal } from "@/shared/utils/decimal";

/**
 * フィルター値の型定義
 */
export type LotFilterValues = {
  /** 検索キーワード（ロット番号、製品コード、製品名） */
  search: string;
  /** 製品コード */
  product_code: string;
  /** 納品先コード */
  delivery_place_code: string;
  /** ステータス */
  status: string;
  /** 在庫ありのみ表示 */
  hasStock: boolean;
};

/**
 * ステータスフィルターの型
 */
export type LotStatusFilter = "all" | "active" | "allocated" | "shipped" | "inactive";

/**
 * 検索キーワードに一致するかチェック
 */
function matchesSearch(lot: LotUI, search: string): boolean {
  const searchLower = search.toLowerCase();
  return (
    lot.lot_number.toLowerCase().includes(searchLower) ||
    lot.product_code?.toLowerCase().includes(searchLower) ||
    lot.product_name?.toLowerCase().includes(searchLower) ||
    false
  );
}

/**
 * ステータスフィルターに一致するかチェック
 */
function matchesStatus(lot: LotUI, status: string): boolean {
  if (status === "all") return true;

  const qty = parseDecimal(lot.current_quantity);
  const isActive = qty.gt(0);

  if (status === "active") return isActive;
  if (status === "inactive") return !isActive;
  // allocated, shipped は現在のデータモデルでは判定できないため、activeと同じ扱い
  if (status === "allocated" || status === "shipped") return isActive;

  return true;
}

/**
 * ロットがフィルター条件に一致するかチェック
 */
function matchesFilter(lot: LotUI, filters: LotFilterValues): boolean {
  // 検索キーワードフィルター
  if (filters.search && !matchesSearch(lot, filters.search)) {
    return false;
  }

  // 製品コードフィルター
  if (filters.product_code && lot.product_code !== filters.product_code) {
    return false;
  }

  // 納品先コードフィルター
  if (filters.delivery_place_code) {
    const lotDeliveryCode = (lot as unknown as { delivery_place_code?: string })
      .delivery_place_code;
    if (lotDeliveryCode !== filters.delivery_place_code) {
      return false;
    }
  }

  // ステータスフィルター
  if (!matchesStatus(lot, filters.status)) {
    return false;
  }

  // 在庫ありフィルター
  if (filters.hasStock && parseDecimal(lot.current_quantity).lte(0)) {
    return false;
  }

  return true;
}

/**
 * ロット一覧をフィルタリングするフック
 *
 * @param lots - ロット一覧
 * @param filters - フィルター値
 * @returns フィルタリングされたロット一覧
 */
export function useLotFilters(lots: LotUI[], filters: LotFilterValues): LotUI[] {
  return useMemo(() => {
    return lots.filter((lot) => matchesFilter(lot, filters));
  }, [lots, filters]);
}
