/**
 * Query Keys
 * React Queryで使用するクエリキーの定義
 *
 * 【設計意図】クエリキー設計の設計判断:
 *
 * 1. なぜクエリキーを一元管理するのか
 *    理由: キャッシュ管理とインバリデーションの一貫性確保
 *    問題:
 *    - クエリキーを各コンポーネントで個別定義 → 文字列のtypo
 *    → キャッシュが分断される（"lots" と "lot" で別キャッシュ）
 *    - インバリデーション時にキーを間違える → データが更新されない
 *    解決:
 *    - クエリキーを集約したファクトリー関数を定義
 *    → 型安全、typo防止、統一されたキャッシュ戦略
 *    メリット:
 *    - キャッシュの依存関係が明確
 *    - インバリデーション漏れを防止
 *
 * 2. 階層的なキー構造の設計（L26-36）
 *    理由: 粒度の異なるインバリデーションに対応
 *    構造:
 *    - lotKeys.all: ["lots"] → ロット関連の全キャッシュ
 *    - lotKeys.lists(): ["lots", "list"] → リスト全般
 *    - lotKeys.list(params): ["lots", "list", {...params}] → 特定検索条件のリスト
 *    - lotKeys.details(): ["lots", "detail"] → 詳細全般
 *    - lotKeys.detail(id): ["lots", "detail", id] → 特定IDの詳細
 *    用途:
 *    - queryClient.invalidateQueries({ queryKey: lotKeys.all })
 *    → ロット関連の全キャッシュを無効化
 *    - queryClient.invalidateQueries({ queryKey: lotKeys.lists() })
 *    → リストのみ無効化（詳細画面は再取得しない）
 *
 * 3. createMasterKeyFactory の設計（L8-21）
 *    理由: マスタデータで共通のパターンを抽出
 *    共通パターン:
 *    - all: ["masters", "products"]
 *    - lists: ["masters", "products", "list"]
 *    - list(params): ["masters", "products", "list", params]
 *    - details: ["masters", "products", "detail"]
 *    - detail(code): ["masters", "products", "detail", code]
 *    メリット:
 *    - DRY原則: 同じパターンを4つのマスタで再利用
 *    - 一貫性: 全マスタで同じキー構造
 *    - 保守性: ファクトリーを修正すれば全マスタに反映
 *
 * 4. as const の使用理由（L9-10, L27-28）
 *    理由: TypeScriptの型推論を最大限活用
 *    効果:
 *    - ["lots"] → readonly ["lots"]（タプル型として推論）
 *    → 配列の要素数・順序・型が厳密に定義される
 *    - クエリキーの型チェックが強化される
 *    例:
 *    ```typescript
 *    const key1 = ["lots", "list"];  // type: string[]
 *    const key2 = ["lots", "list"] as const;  // type: readonly ["lots", "list"]
 *    // key2 の方が厳密な型（要素数2、1番目は"lots"、2番目は"list"）
 *    ```
 *
 * 5. パラメータ付きキーの設計（L29, L44）
 *    理由: 検索条件ごとに異なるキャッシュを保持
 *    例:
 *    - lotKeys.list({ product_code: "A" }): ["lots", "list", { product_code: "A" }]
 *    - lotKeys.list({ product_code: "B" }): ["lots", "list", { product_code: "B" }]
 *    → 製品Aと製品Bで別のキャッシュ
 *    業務的意義:
 *    - ユーザーが製品Aのロット一覧を見る → キャッシュ
 *    - 製品Bのロット一覧に切り替え → 別のキャッシュ（製品Aは保持）
 *    → タブを戻すと即座に表示（再取得不要）
 *
 * 6. ヘルパーメソッドの提供（L32-35, L47-52）
 *    理由: よく使う検索パターンを簡潔に記述
 *    例:
 *    - lotKeys.withStock(): ["lots", "list", { has_stock: true }]
 *    → 在庫ありのロット一覧
 *    - lotKeys.byProduct("P-001"): ["lots", "list", { product_code: "P-001" }]
 *    → 製品P-001のロット一覧
 *    メリット:
 *    - コード可読性向上: byProduct("P-001") と意図が明確
 *    - typo防止: product_code のスペルミスを防ぐ
 *
 * 7. getInventoryQueryKeys() の設計（L95-101）
 *    理由: 関連するキャッシュをまとめてインバリデート
 *    用途:
 *    - 入庫処理後: 在庫が変わる → 在庫関連の全キャッシュを無効化
 *    ```typescript
 *    // 入庫処理
 *    await createLot(lotData);
 *    // 在庫関連の全キャッシュを無効化
 *    getInventoryQueryKeys().forEach(key => {
 *      queryClient.invalidateQueries({ queryKey: key });
 *    });
 *    ```
 *    メリット:
 *    - 一括無効化: 複数のキャッシュを1つの関数で処理
 *    - 抜け漏れ防止: 在庫に関連する全てのキーを網羅
 *
 * 8. getAllocationQueryKeys() の設計（L106-115）
 *    理由: 引当処理後の広範なキャッシュ無効化
 *    業務的背景:
 *    - 引当処理: 受注・在庫・ロット・ダッシュボード等に影響
 *    → 関連する全てのキャッシュを無効化
 *    対象:
 *    - allocations: 引当データ自体
 *    - orders: 受注の引当状態が変わる
 *    - inventory: 在庫の引当可能数が変わる
 *    - dashboard: 統計データが変わる
 *    メリット:
 *    - UI全体の整合性保証
 *    - ユーザーがどの画面を見ても最新データ
 *
 * 9. getForecastQueryKeys() の設計（L120-125）
 *    理由: 計画引当関連のキャッシュ管理
 *    用途:
 *    - 計画引当サマリを更新
 *    - 予測データの履歴を更新
 *    業務シナリオ:
 *    - 営業が計画引当を変更
 *    → 予測サマリ、履歴、関連する全てを再取得
 *
 * 10. QUERY_KEYS オブジェクトの設計（L65-78）
 *     理由: レガシーAPIとの互換性
 *     背景:
 *     - 旧コード: QUERY_KEYS.masters.products() で呼び出し
 *     - 新コード: masterKeys.products.list() で呼び出し
 *     → 両方をサポートすることで、段階的な移行を可能にする
 *     将来的には:
 *     - masterKeys に統一予定
 *     - QUERY_KEYS は deprecated として削除
 */

import type { LotSearchParams } from "@/utils/validators";

const createMasterKeyFactory = <T extends string>(entity: T) => {
  const base = ["masters", entity] as const;
  const lists = () => [...base, "list"] as const;
  const details = () => [...base, "detail"] as const;

  return {
    all: base,
    lists,
    list: (params?: Record<string, unknown>) =>
      params ? ([...lists(), params] as const) : lists(),
    details,
    detail: (code: string) => [...details(), code] as const,
  } as const;
};

/**
 * ロット関連のクエリキー
 */
export const lotKeys = {
  all: ["lots"] as const,
  lists: () => [...lotKeys.all, "list"] as const,
  list: (params?: LotSearchParams) => [...lotKeys.lists(), params] as const,
  details: () => [...lotKeys.all, "detail"] as const,
  detail: (id: number) => [...lotKeys.details(), id] as const,
  withStock: () => [...lotKeys.lists(), { has_stock: true }] as const,
  byProduct: (productCode: string) => [...lotKeys.lists(), { product_code: productCode }] as const,
  bySupplier: (supplierCode: string) =>
    [...lotKeys.lists(), { supplier_code: supplierCode }] as const,
};

/**
 * 受注関連のクエリキー
 */
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params?: LotSearchParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
  byStatus: (status: string) => [...orderKeys.lists(), { status }] as const,
  pending: () => [...orderKeys.byStatus("pending")] as const,
  allocated: () => [...orderKeys.byStatus("allocated")] as const,
  shipped: () => [...orderKeys.byStatus("shipped")] as const,
  byCustomer: (customerCode: string) =>
    [...orderKeys.lists(), { customer_code: customerCode }] as const,
};

/**
 * マスタ関連のクエリキー
 */
export const masterKeys = {
  products: createMasterKeyFactory("products"),
  suppliers: createMasterKeyFactory("suppliers"),
  warehouses: createMasterKeyFactory("warehouses"),
  customers: createMasterKeyFactory("customers"),
} as const;

export const QUERY_KEYS = {
  lots: lotKeys,
  orders: orderKeys,
  masters: {
    products: () => masterKeys.products.list(),
    product: (code: string) => masterKeys.products.detail(code),
    customers: () => masterKeys.customers.list(),
    customer: (code: string) => masterKeys.customers.detail(code),
    warehouses: () => masterKeys.warehouses.list(),
    warehouse: (code: string) => masterKeys.warehouses.detail(code),
    suppliers: () => masterKeys.suppliers.list(),
    supplier: (code: string) => masterKeys.suppliers.detail(code),
  },
} as const;

/**
 * 全てのクエリキーをインバリデートするための配列
 */
export const allQueryKeys = [
  ...lotKeys.all,
  ...orderKeys.all,
  ...masterKeys.products.all,
  ...masterKeys.suppliers.all,
  ...masterKeys.warehouses.all,
  ...masterKeys.customers.all,
] as const;

/**
 * Helper function to invalidate all inventory-related queries
 */
export const getInventoryQueryKeys = () => [
  lotKeys.all,
  ["inventory-items"] as const,
  ["inventory-by-supplier"] as const,
  ["inventory-by-warehouse"] as const,
  ["inventory-by-product"] as const,
];

/**
 * Helper function to invalidate all allocation-related queries
 */
export const getAllocationQueryKeys = () => [
  ["allocations"] as const,
  ["allocationCandidates"] as const,
  orderKeys.all,
  ["order-lines"] as const,
  ["planning-allocation-summary"] as const,
  ...getInventoryQueryKeys(),
  ["dashboard"] as const,
  ["dashboard", "stats"] as const,
];

/**
 * Helper function to invalidate all forecast-related queries
 */
export const getForecastQueryKeys = () => [
  ["forecasts"] as const,
  ["forecasts", "list"] as const,
  ["forecasts", "history"] as const,
  ["planning-allocation-summary"] as const,
];
