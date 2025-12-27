/**
 * グループ化ユーティリティ
 * ロットを製品別にグルーピングする
 *
 * 【設計意図】なぜ製品別・仕入先別にグルーピングするのか:
 *
 * 1. ビジネス要件: 製品 × 仕入先 の組み合わせで在庫を管理
 *    理由: 同じ製品でも、仕入先が異なれば品質や価格が異なる
 *    例:
 *    - 製品「ブレーキパッド A123」
 *      - 仕入先A: 100個在庫
 *      - 仕入先B: 50個在庫
 *    → 2つの独立したグループとして表示
 *    業務上の意味: 仕入先ごとに発注や品質管理を行う
 *
 * 2. key = `${productId}-${supplierCode}` による一意性確保
 *    理由: Map のキーとして使用し、重複を防ぐ
 *    → productId だけでは、同一製品の複数仕入先を区別できない
 *    → 組み合わせキーで、確実に一意性を保証
 *
 * 3. minExpiryDate の計算（L52-57）
 *    理由: グループ内の最短有効期限を把握
 *    用途:
 *    - FEFO引当時、どの製品グループが期限切れリスク高いかを判断
 *    - 在庫一覧で「期限が近い」製品を強調表示
 *    業務上の重要性: 期限切れは顧客クレームや廃棄コストに直結
 *
 * 4. totalCurrentQuantity の集計
 *    理由: グループ全体の在庫数を一目で把握
 *    用途:
 *    - 製品サマリー画面で「製品Aは合計200個在庫あり」と表示
 *    - 発注判断（在庫が少ない製品を優先発注）
 *
 * 5. ソート順序: product_code → supplier_code（L61-65）
 *    理由: ユーザーの業務フローに合わせた表示順
 *    → 製品コード順に表示することで、目的の製品を探しやすい
 *    → 同一製品内では、仕入先コード順（アルファベット順）
 *    業務上の意味: 製品マスタが製品コード順に管理されているため、画面表示も統一
 *
 * 6. Map を使う理由
 *    理由: O(1)でグループ検索可能
 *    → 配列で find() すると O(n)
 *    → ロット数が多い場合（数百件）、パフォーマンス差が顕著
 */

import type { LotUI } from "@/shared/libs/normalize";

export interface ProductGroup {
  key: string; // Unique key for the group (productId-supplierCode)
  productId: number;
  productCode: string;
  productName: string;
  supplierCode: string;
  supplierName: string;
  lots: LotUI[];
  totalCurrentQuantity: number;
  lotCount: number;
  minExpiryDate: string | null;
}

/**
 * ロット配列を製品別・仕入先別にグルーピング
 */
export function groupLotsByProduct(lots: LotUI[]): ProductGroup[] {
  const groupMap = new Map<string, ProductGroup>();

  for (const lot of lots) {
    const productId = lot.product_id;
    const supplierCode = lot.supplier_code ?? "unknown";
    const key = `${productId}-${supplierCode}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        productId,
        productCode: lot.product_code ?? "",
        productName: lot.product_name ?? "",
        supplierCode: (lot.supplier_code as string) ?? "",
        supplierName: lot.supplier_name ?? "",
        lots: [],
        totalCurrentQuantity: 0,
        lotCount: 0,
        minExpiryDate: null,
      });
    }

    const group = groupMap.get(key)!;
    group.lots.push(lot);
    group.lotCount++;
    group.totalCurrentQuantity += Number(lot.current_quantity ?? 0);

    // 最短有効期限を更新
    if (lot.expiry_date) {
      if (!group.minExpiryDate || lot.expiry_date < group.minExpiryDate) {
        group.minExpiryDate = lot.expiry_date;
      }
    }
  }

  // product_code -> supplier_code でソート
  return Array.from(groupMap.values()).sort((a, b) => {
    const productCompare = a.productCode.localeCompare(b.productCode);
    if (productCompare !== 0) return productCompare;
    return a.supplierCode.localeCompare(b.supplierCode);
  });
}
