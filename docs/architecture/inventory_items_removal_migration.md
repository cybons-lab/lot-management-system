# inventory_items テーブル廃止マイグレーションガイド

**更新日:** 2025-11-18
**対象バージョン:** v2.2+

## 概要

`inventory_items` テーブルを完全に廃止し、在庫サマリを `lots` テーブルからリアルタイムで集計する形に移行しました。

## 変更の背景

### 旧設計の問題点

- **複雑な同期ロジック:** `inventory_items` テーブルは `lots` テーブルの集計キャッシュとして機能していたが、トリガーや手動同期が必要
- **データ不整合のリスク:** 2つのデータソースが存在することで、同期ミスによるデータ不整合が発生する可能性
- **保守コストの増加:** トリガーや同期処理のメンテナンスが必要

### 新設計のメリット

- **単一の真実の源:** `lots` テーブルのみが在庫データを保持
- **常に最新のデータ:** リアルタイム集計により、常に正確なデータを提供
- **シンプルな設計:** トリガー・同期処理が不要
- **保守性の向上:** データフローが単純化され、バグの混入リスクが低減

## 変更内容

### 1. バックエンド

#### 削除されたコンポーネント

| カテゴリ | ファイル | 内容 |
|---------|---------|------|
| **モデル** | `backend/app/models/inventory_models.py` | `InventoryItem` クラス削除 |
| **モデル** | `backend/app/models/masters_models.py` | `Warehouse.inventory_items`, `Product.inventory_items` relationship 削除 |
| **モデル** | `backend/app/models/__init__.py` | `InventoryItem`, `LotCurrentStock` エクスポート削除 |
| **スキーマ** | `backend/app/schemas/inventory/inventory_schema.py` | `InventoryItemBase` 削除 |

#### 更新されたコンポーネント

| カテゴリ | ファイル | 変更内容 |
|---------|---------|---------|
| **サービス** | `backend/app/services/inventory/inventory_service.py` | `inventory_items` テーブル参照 → `lots` テーブル集計に変更 |
| **スキーマ** | `backend/app/schemas/inventory/inventory_schema.py` | `InventoryItemResponse` はAPI互換性のために保持（集計専用） |

#### 集計クエリ実装

在庫サマリは以下のSQLで集計されます：

```python
query = db.query(
    Lot.product_id,
    Lot.warehouse_id,
    func.sum(Lot.current_quantity).label("total_quantity"),
    func.sum(Lot.allocated_quantity).label("allocated_quantity"),
    func.sum(
        func.greatest(Lot.current_quantity - Lot.allocated_quantity, 0)
    ).label("available_quantity"),
    func.max(Lot.updated_at).label("last_updated"),
).filter(Lot.status == "active")\
 .group_by(Lot.product_id, Lot.warehouse_id)
```

### 2. データベーススキーマ (DDL)

#### 削除されたテーブル

- `inventory_items` テーブル（DDL ファイルではコメント化）

#### 既存データベースのマイグレーション

既存のデータベースから `inventory_items` テーブルを削除する場合：

```sql
-- テーブルとシーケンスを削除
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP SEQUENCE IF EXISTS inventory_items_inventory_item_id_seq CASCADE;
```

**注意:** この操作は不可逆です。事前にバックアップを取得してください。

### 3. フロントエンド

#### 変更なし

フロントエンドは変更不要です。理由：

- API エンドポイント (`/api/inventory-items`) は維持
- レスポンススキーマは変更なし
- フィールド構造も同じ

唯一の違いは、バックエンドで `inventory_items` テーブルから読み取る代わりに、`lots` テーブルから集計している点のみです。

### 4. API エンドポイント

#### 維持されるエンドポイント

- `GET /api/inventory-items` - 在庫サマリ一覧取得（実装が集計に変更）
- `GET /api/inventory-items/{product_id}/{warehouse_id}` - 在庫サマリ詳細取得（実装が集計に変更）

#### レスポンススキーマ（変更なし）

```json
{
  "inventory_item_id": 1,
  "product_id": 1,
  "warehouse_id": 1,
  "total_quantity": 1000.0,
  "allocated_quantity": 200.0,
  "available_quantity": 800.0,
  "last_updated": "2025-11-18T12:00:00"
}
```

## マイグレーション手順

### ローカル開発環境

#### SQLite (デフォルト)

```bash
# 1. バックエンド起動（テーブルは自動作成される）
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload

# 2. inventory_items テーブルが存在する場合は削除
sqlite3 lot_management.db
sqlite> DROP TABLE IF EXISTS inventory_items;
sqlite> .quit

# 3. アプリケーション再起動
# (自動的に lots テーブルから集計される)
```

#### PostgreSQL (Docker Compose)

```bash
# 1. Docker Compose で起動
docker compose up --build

# 2. PostgreSQL に接続
docker compose exec db-postgres psql -U lotuser -d lotdb

# 3. inventory_items テーブルを削除
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP SEQUENCE IF EXISTS inventory_items_inventory_item_id_seq CASCADE;

# 4. \q で終了し、アプリケーション再起動
docker compose restart lot-backend
```

### 本番環境

本番環境へのデプロイ前に以下を確認してください：

1. **データベースバックアップ:** 必ずバックアップを取得
2. **ダウンタイム:** テーブル削除中は一時的にサービス停止が推奨
3. **ロールバック計画:** 問題発生時の復旧手順を準備

#### デプロイ手順

```bash
# 1. バックアップ取得
pg_dump -U <user> -d <database> > backup_before_migration.sql

# 2. 新しいコードをデプロイ
git pull origin main
docker compose up --build -d

# 3. データベース接続
psql -U <user> -d <database>

# 4. inventory_items テーブル削除
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP SEQUENCE IF EXISTS inventory_items_inventory_item_id_seq CASCADE;

# 5. アプリケーション再起動
docker compose restart lot-backend

# 6. 動作確認
curl http://localhost:8000/api/inventory-items
```

## 動作確認

### 1. API レスポンス確認

```bash
# 在庫サマリ一覧取得
curl http://localhost:8000/api/inventory-items

# 在庫サマリ詳細取得
curl http://localhost:8000/api/inventory-items/1/1
```

### 2. フロントエンド確認

ブラウザで以下のページを開き、正常に表示されることを確認：

- **在庫管理トップ (Summary Page):** http://localhost:5173/inventory/summary
- **在庫アイテム詳細:** http://localhost:5173/inventory/items/1/1

確認ポイント：

- ✅ 在庫サマリカードが表示される
- ✅ 在庫一覧テーブルが表示される
- ✅ 統計情報（総在庫数、利用可能在庫数など）が正しく計算されている
- ✅ `lots` テーブルにデータがあれば、サマリが表示される

### 3. パフォーマンス確認

大量のロットデータがある場合、集計クエリのパフォーマンスを確認：

```bash
# PostgreSQL でクエリ実行計画を確認
EXPLAIN ANALYZE
SELECT
  product_id,
  warehouse_id,
  SUM(current_quantity) AS total_quantity,
  SUM(allocated_quantity) AS allocated_quantity,
  SUM(GREATEST(current_quantity - allocated_quantity, 0)) AS available_quantity,
  MAX(updated_at) AS last_updated
FROM lots
WHERE status = 'active'
GROUP BY product_id, warehouse_id;
```

**期待される結果:**
- インデックス `idx_lots_product_warehouse` が使用されている
- クエリ実行時間が許容範囲内（通常 < 100ms）

パフォーマンス問題が発生した場合は、以下のインデックスを追加検討：

```sql
-- 既存インデックスで対応できない場合
CREATE INDEX idx_lots_status_product_warehouse
ON lots(status, product_id, warehouse_id);
```

## トラブルシューティング

### Q: inventory_items テーブルが見つからないエラーが出る

**A:** 古いコードが残っている可能性があります。以下を確認：

```bash
# 1. Git で最新コードを取得
git pull origin main

# 2. Python 仮想環境を再作成
cd backend
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. アプリケーション再起動
uvicorn app.main:app --reload
```

### Q: フロントエンドで在庫サマリが表示されない

**A:** 以下を確認：

1. **バックエンドが起動しているか:** http://localhost:8000/api/docs
2. **lots テーブルにデータがあるか:**
   ```sql
   SELECT COUNT(*) FROM lots WHERE status = 'active';
   ```
3. **ブラウザの開発者ツールでネットワークエラーを確認**

### Q: パフォーマンスが遅い

**A:** 以下を試してください：

1. **インデックスの確認:**
   ```sql
   \d+ lots  -- PostgreSQL
   ```
2. **クエリの最適化:** ページネーション (skip/limit) を使用
3. **キャッシング:** 必要に応じて Redis などのキャッシュを導入

## ロールバック手順

問題が発生した場合のロールバック手順：

### 1. コードのロールバック

```bash
# 1. 旧バージョンに戻す
git checkout <previous-commit-hash>

# 2. Docker Compose 再ビルド
docker compose up --build -d
```

### 2. データベースの復元

```bash
# バックアップから復元
psql -U <user> -d <database> < backup_before_migration.sql
```

### 3. inventory_items テーブルの再作成

```sql
-- DDL ファイルから inventory_items テーブルを再作成
-- (docs/schema/base/lot_management_ddl_v2_2_id.sql の履歴版を参照)

-- 注意: データは空になるため、同期処理が必要
```

## まとめ

この変更により、在庫管理システムのアーキテクチャがよりシンプルになり、保守性が向上しました。

**主なポイント:**

- ✅ `inventory_items` テーブルは完全に削除
- ✅ 在庫サマリは `lots` テーブルから集計
- ✅ API エンドポイントとレスポンス構造は変更なし
- ✅ フロントエンドは変更不要
- ✅ 常に最新のデータを保証

## 関連ドキュメント

- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体の概要
- [backend_cleanup_2025-11-18.md](./backend_cleanup_2025-11-18.md) - バックエンドクリーンアップ履歴
- [DDL v2.2](../schema/base/lot_management_ddl_v2_2_id.sql) - データベーススキーマ

## 変更履歴

- **2025-11-18:** `inventory_items` テーブル廃止、リアルタイム集計に移行
