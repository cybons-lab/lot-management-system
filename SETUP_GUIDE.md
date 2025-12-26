# ロット管理システム v2.0 - 完全セットアップガイド

## 📋 目次

1. [概要](#概要)
2. [システム要件](#システム要件)
3. [セットアップ手順](#セットアップ手順)
4. [動作確認](#動作確認)
5. [API 使用例](#api使用例)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このドキュメントは、ロット管理システム v2.0 のバックエンドを一から構築・起動するための完全なガイドです。

### 主な改善点

✅ **モデルの分割構造**

- `models/base_model.py` - 基底クラス
- `models/masters.py` - マスタテーブル
- `models/inventory.py` - 在庫管理
- `models/sales.py` - 販売管理
- `models/logs.py` - ログ管理

✅ **日付型の適切な使用**

- TEXT 型 → Date/DateTime 型に変更
- FEFO(先入先出)の正確な実装

✅ **パフォーマンス最適化**

- `lot_current_stock`サマリテーブル追加
- 在庫参照の高速化

✅ **単位換算対応**

- `product_uom_conversions`テーブル追加
- ケース → 個などの換算に対応

---

## システム要件

### 必須環境

- **Python**: 3.13 以上
- **pip**: 最新版
- **OS**: Windows, macOS, Linux

### 推奨環境

- **メモリ**: 4GB 以上
- **ディスク**: 1GB 以上の空き容量

---

## セットアップ手順

### Step 1: プロジェクト構造の確認

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base_model.py
│   │   ├── masters.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   └── logs.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── masters.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   └── integration.py
│   └── api/
│       ├── __init__.py
│       ├── deps.py
│       └── routes/
│           ├── __init__.py
│           ├── masters.py
│           ├── lots.py
│           ├── receipts.py
│           ├── orders.py
│           ├── integration.py
│           └── admin.py
├── requirements.txt
├── .env.example
└── README.md
```

### Step 2: 仮想環境の作成

```bash
# backendディレクトリに移動
cd backend

# 仮想環境の作成
python -m venv .venv

# 仮想環境の有効化
# Windows:
.venv\Scripts\activate

# macOS/Linux:
source .venv/bin/activate
```

### Step 3: 依存関係のインストール

```bash
# uv を使用（推奨）
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# または pip を使用する場合
pip install --upgrade pip
pip install -r requirements.txt  # パッケージングスクリプトで生成
```

> **Note**: このプロジェクトは `pyproject.toml` + `uv` で依存関係を管理しています。
> `requirements.txt` は `scripts/build_deploy_package.py` で自動生成されます。

### Step 4: 環境変数の設定

```bash
# .env.example を .env にコピー
cp .env.example .env

# 必要に応じて編集
# Docker環境では自動設定されます
```

**.env の例:**

```env
ENVIRONMENT=development
# DATABASE_URL=postgresql://admin:dev_password@localhost:5432/lot_management
```

### Step 5: データベースマイグレーションの実行

```bash
cd backend

# Alembicマイグレーション実行
alembic upgrade head

# データベースビューの作成
python scripts/apply_views.py
```

**マイグレーション成功時の出力例:**

```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 977979c11ee5, add_optimistic_lock_and_allocation_traces
INFO  [alembic.runtime.migration] Running upgrade 977979c11ee5 -> 2dca571dcd33, add_unit_columns
...
```

**ビュー作成成功時の出力例:**

```
============================================================
🔧 データベースビュー作成スクリプト
============================================================
📁 SQLファイル: backend/views/create_views.sql
🗄️  データベース: localhost:5432/lot_management

⏳ ビューを作成中...

============================================================
✅ ビューの作成が完了しました
============================================================

作成されたビュー:
  1. v_lot_current_stock
  2. v_customer_daily_products
  ...
```

### Step 6: アプリケーションの起動

```bash
# 開発サーバー起動(ホットリロード有効)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# または
python -m app.main
```

**起動成功時の出力例:**

```
🚀 ロット管理システム v2.0.0 を起動しています...
📦 環境: development
💾 データベース: postgresql://admin:***@localhost:5432/lot_management
✅ データベーステーブルを作成しました
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## 動作確認

### 1. ヘルスチェック

ブラウザまたは curl で確認:

```bash
curl http://localhost:8000/api/admin/health
```

**期待される出力:**

```json
{
  "status": "healthy",
  "environment": "development",
  "app_name": "ロット管理システム",
  "app_version": "2.0.0",
  "database": "postgresql"
}
```

### 2. API ドキュメント

ブラウザで以下にアクセス:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### 3. サンプルデータの投入

```bash
curl -X POST http://localhost:8000/api/admin/init-sample-data
```

**期待される出力:**

```json
{
  "success": true,
  "message": "サンプルデータを投入しました",
  "data": {
    "warehouses": 2,
    "suppliers": 2,
    "customers": 2,
    "products": 3
  }
}
```

### 4. マスタデータの確認

```bash
# 製品一覧取得
curl http://localhost:8000/api/masters/products
```

---

## API 使用例

### 1. ロット登録

```bash
curl -X POST "http://localhost:8000/api/lots" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_code": "SUP001",
    "product_code": "PRD-001",
    "lot_number": "LOT-2024-1101",
    "receipt_date": "2024-11-01",
    "expiry_date": "2025-11-01",
    "warehouse_code": "WH001"
  }'
```

### 2. 在庫変動(入荷)

```bash
curl -X POST "http://localhost:8000/api/lots/movements" \
  -H "Content-Type: application/json" \
  -d '{
    "lot_id": 1,
    "movement_type": "receipt",
    "quantity": 100.0,
    "related_id": "receipt_001"
  }'
```

### 3. ロット一覧取得(在庫付き)

```bash
curl "http://localhost:8000/api/lots?with_stock=true"
```

### 4. 受注登録(OCR 取込シミュレーション)

```bash
curl -X POST "http://localhost:8000/api/integration/ai-ocr/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "PAD",
    "schema_version": "1.0.0",
    "file_name": "order_20241101.csv",
    "records": [
      {
        "order_no": "ORD-20241101-001",
        "customer_code": "CUS001",
        "order_date": "2024-11-01",
        "lines": [
          {
            "line_no": 1,
            "product_code": "PRD-001",
            "quantity": 50.0,
            "unit": "EA",
            "due_date": "2024-11-15"
          }
        ]
      }
    ]
  }'
```

### 5. ドラッグ引当

```bash
curl -X POST "http://localhost:8000/api/orders/allocations/drag-assign" \
  -H "Content-Type: application/json" \
  -d '{
    "order_line_id": 1,
    "lot_id": 1,
    "allocate_qty": 30.0
  }'
```

### 6. SAP 送信(モック)

```bash
curl -X POST "http://localhost:8000/api/integration/sap/register" \
  -H "Content-Type: application/json" \
  -d '{
    "target": {
      "type": "order_no",
      "value": "ORD-20241101-001"
    },
    "options": {
      "retry": 1,
      "timeout_sec": 30
    }
  }'
```

---

## トラブルシューティング

### エラー: ModuleNotFoundError

**原因:** Python パスが正しく設定されていない

**解決方法:**

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
# または
pip install -e .
```

### エラー: Connection refused

**原因:** データベースが起動していない

**解決方法:**

```bash
# Dockerコンテナの状態確認
docker-compose ps

# ログ確認
docker-compose logs db
```

### エラー: pydantic_core.\_pydantic_core.ValidationError

**原因:** スキーマ定義とデータ型の不一致

**解決方法:**

- リクエストボディのフォーマットを確認
- 日付は `YYYY-MM-DD` 形式
- 数値は float 型

### ポート衝突

**エラー:** `Address already in use`

**解決方法:**

```bash
# 別のポートで起動
uvicorn app.main:app --reload --port 8001

# または既存プロセスを停止
# Windowsの場合:
taskkill /F /IM python.exe

# macOS/Linuxの場合:
lsof -ti:8000 | xargs kill -9
```

### データベースリセット

開発中にスキーマを変更した場合:

```bash
curl -X POST http://localhost:8000/api/admin/reset-database
```

---

## 次のステップ

✅ バックエンド起動完了!

次に実施すべきこと:

1. **フロントエンド連携**

   - React フロントエンドを起動
   - API 接続の確認

2. **実データ投入**

   - マスタデータの登録
   - 実際のロット・受注データの投入

3. **本番環境準備**

   - 本番用データベースの構築
   - 環境変数の本番設定
   - Docker 化

4. **監視・ログ**
   - 構造化ログの設定
   - エラー通知の設定

---

## サポート

問題が発生した場合:

1. ログを確認: アプリケーションのコンソール出力
2. データベースの状態確認: pgAdminまたはCLIで確認
3. API ドキュメント参照: http://localhost:8000/api/docs

---

**作成日**: 2024 年 11 月 1 日
**バージョン**: 2.0.0
