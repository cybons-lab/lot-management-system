# Phase1 ビュー修正ツール - クイックスタート

## 問題

本番環境で在庫ページにアクセスすると 500 エラー:
```
列v.supplier_item_idは存在しません (Column v.supplier_item_id does not exist)
```

## 解決方法（3ステップ）

### 1. 現状確認

```bash
python dump_view_definition.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

**出力:**
- ✅ Column 'supplier_item_id' EXISTS → 修正不要
- ❌ Column 'supplier_item_id' NOT FOUND → 次のステップへ

### 2. 修正実行

```bash
python check_and_fix_view.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

確認メッセージで `yes` を入力。

### 3. 動作確認

```bash
python verify_view_fix.py --host localhost --port 5432 --user postgres --password YOUR_PASSWORD --database lot_management
```

**期待される出力:**
```
🎉 ALL CHECKS PASSED
```

---

## ファイル説明

| ファイル | 用途 | いつ使う |
|---------|------|---------|
| `dump_view_definition.py` | 診断 | 現状確認したい |
| `check_and_fix_view.py` | 修正 | ビューを直したい |
| `verify_view_fix.py` | 検証 | 修正後の確認 |
| `PRODUCTION_VIEW_FIX.md` | 詳細手順書 | 詳しく知りたい |

---

## 前提条件

```bash
# psycopg2 のインストール
pip install psycopg2-binary
```

---

## トラブルシューティング

**Q: Python が入っていない**
- Python 3.13 以上をインストール: https://www.python.org/downloads/

**Q: psycopg2 が見つからない**
```bash
pip install psycopg2-binary
```

**Q: 接続できない**
- ホスト名、ポート、ユーザー、パスワードを確認
- PostgreSQL が起動しているか確認

**Q: スクリプトが失敗する**
- 詳細手順書を参照: `PRODUCTION_VIEW_FIX.md`
- または手動でSQLを実行（手順書に記載）

---

## 手動修正（スクリプトが使えない場合）

psql または pgAdmin で以下を実行:

```sql
-- Step 1: バックアップ
pg_dump -t v_lot_receipt_stock --schema-only > backup_view.sql

-- Step 2: ビュー削除
DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE;

-- Step 3: ビュー再作成（SQLは PRODUCTION_VIEW_FIX.md を参照）
CREATE OR REPLACE VIEW v_lot_receipt_stock AS ...

-- Step 4: 確認
SELECT column_name FROM information_schema.columns
WHERE table_name = 'v_lot_receipt_stock' AND column_name = 'supplier_item_id';
```

---

## 詳細情報

詳しくは `PRODUCTION_VIEW_FIX.md` を参照してください。
