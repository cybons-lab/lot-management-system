# Phase1 根本対策 - 実装計画書 (PHASE1_IMPLEMENTATION_PLAN.md)

## 1. 概要
本計画は、`product_group_id` から `supplier_item_id` への完全移行を「一発で完璧に」実施するための手順書である。

## 2. マイグレーション手順 (Step 3)

### 2.1. マイグレーションファイル作成
`backend/alembic/versions/phase1_complete_migration.py` を作成し、以下の処理を実装する。

1.  **データ移行**: `lot_receipts`, `order_lines`, `forecast_current`, `inbound_plan_lines`, `lot_master` 等において、`product_group_id` の値を `supplier_item_id` にコピー（`supplier_item_id` が NULL の場合）。
2.  **制約の更新**:
    - `supplier_item_id` カラムを `NOT NULL` に変更。
    - `product_group_id` カラムに関連する外部キー制約、インデックスを削除。
    - `product_group_id` カラムを削除。
3.  **カラム名のリネーム**:
    - `product_warehouse`, `product_uom_conversions`, `warehouse_delivery_routes` 等の `product_group_id` を `supplier_item_id` にリネーム。
4.  **ビューの再作成**: すべてのビューを `supplier_item_id` を使用する定義で再作成。

## 3. バックエンドコード修正 (Step 4)

### 3.1. モデル修正
- `app/infrastructure/persistence/models/` 配下の各モデルから `product_group_id` を削除し、`supplier_item_id` を必須化。
- リレーションのバックポピュレート名が `product_group` になっている場合は必要に応じて `supplier_item` にリネーム。

### 3.2. スキーマ修正
- `app/presentation/schemas/` 配下から `product_group_id` のエイリアス (`validation_alias`, `serialization_alias`) を削除。
- フィールド名を `supplier_item_id` に統一。

### 3.3. サービス・リポジトリ修正
- `product_group_id` という変数名を使っている箇所をすべて `supplier_item_id` に変更。
- 検索ロジック等の引数を更新。

## 4. フロントエンドコード修正 (Step 4)
- `product_group_id` を `supplier_item_id` に一括置換。
- 置換対象: `src/types/`, `src/features/*/api.ts`, コンポーネント, フック, テスト。
- 置換後、`npm run typegen` を実行して OpenAPI 定義との整合性を確認。

## 5. テスト・検証手順 (Step 5)

### 5.1. バックエンドテスト
- `pytest` を実行し、既存のテスト（特に API v2 系）がすべてパスすることを確認。
- `docker compose exec backend pytest backend/tests/api/v2/`

### 5.2. フロントエンド検証
- `npm run typecheck` で型エラーがないことを確認。
- `npm run lint` で Lint エラーがないことを確認。

### 5.3. データベースマイグレーション検証
- データベースをリセットし、最初からマイグレーションを実行して正常に完了するか確認。
- サンプルデータを投入し、ビューが正しくデータを返すか確認。

## 6. デプロイ・ロールバック手順

### 6.1. デプロイ順序
1.  バックエンドコードとマイグレーションをデプロイ。
2.  マイグレーション実行 (`alembic upgrade head`)。
3.  フロントエンドコードをデプロイ。

### 6.2. ロールバック手順
`docs/project/ROLLBACK_PROCEDURE.md` に詳細を記載するが、基本方針は以下の通り：
1.  データベースをバックアップから復元（マイグレーションで列を削除するため、SQLのみのロールバックは危険）。
2.  フロントエンド、バックエンドのコードを前のバージョンに戻す。
