# Order Number Refactoring Status & Next Steps

## 概要
`orders` テーブルから `order_number` カラムを削除し、`order_groups` への移行を進めるリファクタリング作業の中断時点のステータスです。

## 現在のステータス
*   **Backend**: コード修正、DBマイグレーション、テスト修正全て完了 (**All Tests Passed**)。
*   **Frontend**: API型定義同期エラーとビルドエラー(tsc)を解消済。本格的なUIリファクタリングは未着手。
*   **CI/Scripts**: `export_openapi.py` 等のスクリプトをCI環境で動作するように修正済。

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
    *   API型定義 (`api.d.ts`) の更新と、それに伴う型エラー(`tsc`)の解消 (`order_no` 参照の削除)。
    *   `export_openapi.py` / `openapi_diff_check.py` の `DATABASE_URL` 未設定エラー修正。
    *   `BatchJobExecuteRequest` 等の型定義差異（`uv`環境依存）を修正し、Prettierエラーを解消。

## 残タスク

### 1. Frontend Refactoring (Continued)
型チェックは通るようになりましたが、UIの表示内容は未確認です。
*   **Target**: `OrderList`, `InventoryPage`, その他注文情報を表示するコンポーネント。
*   **Action**:
    *   `OrderCard` では便宜上 `order.id` を表示するように修正しましたが、これが適切か確認してください。
    *   `customer_order_no` や `sap_order_no` をより強調するUIへの変更が必要かもしれません。

### 2. Verification
*   バックエンド、フロントエンド双方の修正後、E2Eでの動作確認（注文作成、一覧表示、引当など）を推奨。

## 懸念事項・注意点
*   **表示要件の変更**: `order_number` (ビジネスキー) がなくなるため、UI上での注文の識別が `ID` (Internal ID) になります。ユーザーにとって識別しにくくないか、画面によっては `customer_order_no` を強調するなどのUI調整が必要になる可能性があります。
*   **Alembic Migration**: 生成したマイグレーションファイルは「ビューのDROP/CREATE」を「カラム削除」の前に実行するように手動で順序調整済みです。これを崩さないように注意してください。
*   **DBビューの依存関係**: `v_order_line_details` 以外にも `order_number` に依存しているカスタムクエリやレポートがないか、念のため注意してください（現状のgrep調査では概ねカバーできています）。

## コミット状況
*   ここまでの変更は全てコミット済み（またはこの直後にコミットされます）。
*   ブランチ: 現在の作業ブランチを確認してください。
