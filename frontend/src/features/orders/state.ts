/**
 * Orders Feature State (Jotai atoms)
 *
 * 受注機能の状態管理
 * - リストページのフィルタ状態をsessionStorageで永続化
 *
 * 【設計意図】受注状態管理の設計判断:
 *
 * 1. atomWithStorage の使用
 *    理由: Jotaiのatom + ブラウザストレージの永続化
 *    メリット:
 *    - フィルター条件がタブ閉じても保持される（sessionStorage）
 *    - ページリロード後も同じフィルター状態で表示
 *    ユーザー体験:
 *    - 営業担当者が「ステータス: 未確定」でフィルタ
 *    → タブを閉じて再度開いても、フィルタが保持されている
 *
 * 2. sessionStorage vs localStorage の選択
 *    理由: sessionStorage を選択
 *    sessionStorage: タブを閉じると消える
 *    localStorage: ブラウザを閉じても永続
 *    判断根拠:
 *    - 受注フィルタは一時的な作業状態
 *    - 新しいタブでは、デフォルト状態から開始したい
 *    → sessionStorage が適切
 *
 * 3. getOnInit: true の意味
 *    理由: 初回レンダリング時に即座にストレージから読み込む
 *    動作:
 *    - true: 同期的に sessionStorage から読み込み
 *    - false: 非同期的に読み込み（初回は INITIAL_STATE）
 *    メリット: ページ表示時にフィルタが即座に適用される
 *
 * 4. createJSONStorage の使用
 *    理由: JSON シリアライズ/デシリアライズを自動化
 *    → filters オブジェクトを自動的に JSON に変換して保存
 *    → 読み込み時は JSON から自動的にパース
 *    代替案: 手動で JSON.stringify/parse → エラーが起きやすい
 *
 * 5. キー "orders:pageState" の命名
 *    理由: 複数の feature で sessionStorage を使うため、名前空間を分離
 *    → "orders:" プレフィックスで、他の feature と衝突しない
 *    例:
 *    - orders:pageState（受注ページ）
 *    - inventory:pageState（在庫ページ）
 *    → 独立して管理可能
 */

import { atomWithStorage, createJSONStorage } from "jotai/utils";

import type { OrdersListParams } from "@/shared/types/aliases";

const storage = createJSONStorage<OrdersPageState>(() => sessionStorage);

export interface OrdersPageState {
  filters: OrdersListParams;
}

const INITIAL_STATE: OrdersPageState = {
  filters: {
    limit: 20,
    skip: 0,
  },
};

/**
 * 受注ページ状態atom
 * キー: orders:pageState
 */
export const ordersPageStateAtom = atomWithStorage<OrdersPageState>(
  "orders:pageState",
  INITIAL_STATE,
  storage,
  { getOnInit: true },
);
