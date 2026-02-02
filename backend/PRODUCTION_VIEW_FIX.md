# Phase1 本番環境ビュー修正手順

## 概要

本番環境で `v_lot_receipt_stock` ビューに `supplier_item_id` 列が存在しないため、在庫関連ページで 500 エラーが発生している問題を修正します。

**エラーメッセージ:** `列v.supplier_item_idは存在しません (Column v.supplier_item_id does not exist)`

**根本原因:** Phase1 マイグレーション適用時にビューの更新が正しく反映されなかった。

---

## 前提条件

- PostgreSQL クライアント（psql または pgAdmin）がインストール済み
- Python 3.13 以上がインストール済み
- psycopg2-binary がインストール済み（`pip install psycopg2-binary`）
- 本番データベースへの接続情報（ホスト、ポート、ユーザー、パスワード、DB名）

---

## 手順

### Step 1: バックアップを取得（必須）

```bash
# ビュー定義のバックアップ
pg_dump -h <HOST> -U <USER> -d <DATABASE> --schema-only -t v_lot_receipt_stock > backup_view_definition.sql

# 念のため全データベースのバックアップ（推奨）
pg_dump -h <HOST> -U <USER> -d <DATABASE> -F c -f backup_full.dump
```

### Step 2: 現状確認（診断スクリプト実行）

**Windows の場合:**

```cmd
python dump_view_definition.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

**出力ファイル:**
- `view_definition.sql` - 現在のビュー定義
- `table_schemas.sql` - 関連テーブルのスキーマ
- `table_data_sample.sql` - サンプルデータ（最大10件）

**確認すべきこと:**
- コンソール出力で `❌ Column 'supplier_item_id' NOT FOUND` と表示されるか
- `lot_receipts` テーブルに `supplier_item_id` 列が存在するか（`table_schemas.sql` を確認）

### Step 3: ビュー修正（自動スクリプト）

**オプション1: 対話モードで実行（推奨）**

```cmd
python check_and_fix_view.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

確認メッセージが表示されたら `yes` を入力。

**オプション2: 自動実行**

```cmd
python check_and_fix_view.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management --auto-fix
```

**オプション3: チェックのみ（修正しない）**

```cmd
python check_and_fix_view.py --check-only --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

### Step 4: 手動修正（スクリプトが使えない場合）

psql または pgAdmin で以下のSQLを実行:

```sql
-- ビューを削除（依存ビューがあればCASCADEで一緒に削除される）
DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE;

-- 正しい定義でビューを再作成
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS lot_id,
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id,
    si.maker_part_no AS product_code,
    si.maker_part_no,
    si.maker_part_no AS maker_part_code,
    si.display_name AS product_name,
    si.display_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity,
    lr.consumed_quantity,
    (lr.received_quantity - lr.consumed_quantity) AS current_quantity,
    GREATEST((lr.received_quantity - lr.consumed_quantity - lr.locked_quantity), 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST((lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0)), 0) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.inspection_date,
    lr.inspection_cert_number,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    lr.temporary_lot_key,
    lr.origin_type,
    lr.origin_reference,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL THEN (lr.expiry_date - CURRENT_DATE)
        ELSE NULL
    END AS days_to_expiry
FROM
    lot_receipts lr
    JOIN lot_master lm ON lr.lot_master_id = lm.id
    LEFT JOIN supplier_items si ON COALESCE(lr.supplier_item_id, lr.product_group_id) = si.id
    LEFT JOIN warehouses w ON lr.warehouse_id = w.id
    LEFT JOIN suppliers s ON lm.supplier_id = s.id
    LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
    LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE
    lr.status = 'active';

-- 確認: supplier_item_id 列が存在するか
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'v_lot_receipt_stock'
  AND column_name = 'supplier_item_id';
```

### Step 5: 動作確認

**5-1. ビュー構造の確認**

```sql
\d+ v_lot_receipt_stock
```

または

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'v_lot_receipt_stock'
ORDER BY ordinal_position;
```

**確認ポイント:**
- `supplier_item_id` 列が存在すること
- 他の必須列（`product_code`, `maker_part_code`, `product_name` など）が存在すること

**5-2. ビューからのクエリテスト**

```sql
-- inventory_service.py で使われているクエリ
SELECT
    v.supplier_item_id,
    v.supplier_id,
    v.warehouse_id,
    COUNT(*) as receipt_count
FROM v_lot_receipt_stock v
GROUP BY v.supplier_item_id, v.supplier_id, v.warehouse_id
LIMIT 5;
```

エラーが出なければ成功。

**5-3. バックエンド再起動**

```bash
# バックエンドアプリを再起動
# （Docker環境の場合）
docker compose restart backend

# （サービスとして動いている場合）
systemctl restart lot-management-backend
```

**5-4. UI動作確認**

1. ブラウザで在庫ページにアクセス: `http://localhost:3000/inventory`
2. エラーが出ないこと
3. 在庫データが表示されること

### Step 6: 検証スクリプト実行

修正後に再度診断スクリプトを実行:

```cmd
python verify_view_fix.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

**期待される出力:**
```
[Check 1] ✅ PASS: 'supplier_item_id' column exists
[Check 2] ✅ PASS: All required columns exist
[Check 3] ✅ PASS: View query successful
[Check 4] ✅ PASS: GROUP BY query successful
🎉 ALL CHECKS PASSED
```

---

## トラブルシューティング

### Q1: Python スクリプトで `psycopg2` が見つからない

**A1:** インストールしてください:
```bash
pip install psycopg2-binary
```

### Q2: `DROP VIEW` で依存ビューのエラーが出る

**A2:** `CASCADE` を使用しているので、依存ビューも一緒に削除されます。問題ありません。

### Q3: バックエンド再起動後もエラーが出る

**A3:** 以下を確認:
1. ビュー定義が正しく更新されているか（Step 5-1）
2. バックエンドログにエラーが出ていないか
3. フロントエンドのキャッシュをクリアしてリロード（Ctrl+Shift+R）

### Q4: UTF-8 エンコーディングエラーが出る（Windows）

**A4:** スクリプトは UTF-8 BOM なしで保存されています。それでもエラーが出る場合:
```cmd
chcp 65001
python check_and_fix_view.py ...
```

### Q5: スクリプト実行時に接続エラー

**A5:** 接続情報を確認:
- ホスト: 通常は `localhost`（Docker内部の場合は別）
- ポート: デフォルトは `5432`
- ユーザー/パスワード: PostgreSQL の接続情報
- データベース名: `lot_management`

---

## 必要なファイル（本番へコピー）

以下のファイルを本番サーバーの `backend/` ディレクトリにコピー:

1. **dump_view_definition.py** - 診断用（現状確認）
2. **check_and_fix_view.py** - 修正用（自動修正）
3. **verify_view_fix.py** - 検証用（修正後確認）
4. **PRODUCTION_VIEW_FIX.md** - このドキュメント

---

## 作業後の片付け

修正完了後、以下のファイルは削除してOK:
- `backend/fix_phase1_production.py`（旧版・UTF-8問題あり）
- `scripts/fix_phase1_views.py`（Docker前提）
- `scripts/fix_phase1_views.sh`（Bash・Windows不可）
- `backend/fix_view.sql`（手動SQL）
- `backend/fix_view_production.sql`（手動SQL）
- `docs/HOTFIX_PHASE1.md`（旧ドキュメント）

---

## 参考情報

- **根本原因:** `backend/alembic/versions/products_to_product_groups.py` の 201行目に正しいビュー定義があるが、本番で適用されなかった
- **inventory_service.py:** 876行目で `v.supplier_item_id` を使用
- **customer_items_schema.py:** `validation_alias="product_group_id"` で 422 エラーは解消済み

---

## 連絡先

問題が発生した場合は、開発チームに連絡してください。
