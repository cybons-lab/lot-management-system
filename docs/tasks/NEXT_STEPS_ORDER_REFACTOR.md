# Order Number Refactoring Status & Next Steps

## 概要
`orders` テーブルから `order_number` カラムを削除し、`order_groups` への移行を進めるリファクタリング作業の中断時点のステータスです。

## 現在のステータス
*   **Backend**: コード修正とDBマイグレーションはほぼ完了。テスト修正が9割完了し、残りわずかなエラーが残っている状態。
*   **Frontend**: **未着手**。

## 完了した作業
1.  **Database & Migration**
    *   `alembic/versions/1fc6aeb192f2_remove_order_number_from_orders.py`: `orders.order_number` カラム削除と `v_order_line_details` ビューの更新を含むマイグレーションを作成済み。
    *   `backend/sql/views/create_views.sql`: SQLビュー定義ファイル更新済み。
2.  **Backend Code**
    *   `Order` モデル (`orders_models.py`) から `order_number` を削除。
    *   Pydantic Schemas (`orders_schema.py`, etc.) 更新済み。
    *   Services (`order_service.py`, `allocations/utils.py`) のロジック更新済み。
    *   `conftest.py`: テスト用DBビュー定義を更新済み。
3.  **Backend Tests**
    *   多くのテストファイル (`test_orders.py`, `test_allocations.py` 等) で `order_number` 引数を削除・修正済み。
    *   `test_allocation_suggestions.py` のインポートエラー修正済み。

## 残タスク

### 1. Backend Testの修正完了 (High Priority)
現在 `pytest` を実行すると以下のエラーが発生しています。
*   **File**: `tests/services/test_preempt_soft_allocations.py`
*   **Error**: `TypeError: create_order_line() takes 4 positional arguments but 5 were given`
*   **原因**: テストヘルパー関数 `create_order_line` の呼び出し箇所で引数の数が合っていない（おそらく `order_number` が削除された影響でずれている）。
*   **Action**: 該当ファイルのヘルパー呼び出しを修正し、全テスト (`pytest tests/`) が **Passed** になることを確認してください。

### 2. Frontend Refactoring (High Priority)
フロントエンド側の修正は手つかずです。以下の対応が必要です。
*   **Target**: `frontend/src` 以下のファイル (約24ファイル)。
*   **Action**:
    *   API型定義 (`api.d.ts`) の更新（バックエンドに合わせて再生成が必要）。
    *   UIコンポーネントで `order_number` を表示している箇所を特定し、`order.id` (ID表示) や `order_lines.customer_order_no` (客先注文番号) など、文脈に合わせて適切なフィールドに置き換える。
    *   特に `InventoryPage.tsx` や `OrderList` 系のコンポーネントは影響が大きいと予想されます。
*   **Check**: `npm run typecheck` (tsc) が通ること。

### 3. Verification
*   バックエンド、フロントエンド双方の修正後、E2Eでの動作確認（注文作成、一覧表示、引当など）を推奨。

## 懸念事項・注意点
*   **表示要件の変更**: `order_number` (ビジネスキー) がなくなるため、UI上での注文の識別が `ID` (Internal ID) になります。ユーザーにとって識別しにくくないか、画面によっては `customer_order_no` を強調するなどのUI調整が必要になる可能性があります。
*   **Alembic Migration**: 生成したマイグレーションファイルは「ビューのDROP/CREATE」を「カラム削除」の前に実行するように手動で順序調整済みです。これを崩さないように注意してください。
*   **DBビューの依存関係**: `v_order_line_details` 以外にも `order_number` に依存しているカスタムクエリやレポートがないか、念のため注意してください（現状のgrep調査では概ねカバーできています）。

## コミット状況
*   ここまでの変更は全てコミット済み（またはこの直後にコミットされます）。
*   ブランチ: 現在の作業ブランチを確認してください。
