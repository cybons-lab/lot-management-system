# バックエンドファイル命名標準化 - リネームマッピング表

## 概要

このドキュメントは、FastAPI + SQLAlchemy 2.0 バックエンドのファイル命名と配置を標準化するためのリネームマッピング表です。

## 命名規約

### 役割語尾
- ルータ: `*_router.py`
- サービス: `*_service.py`
- リポジトリ: `*_repository.py`
- Pydanticスキーマ: `*_schema.py`
- SQLAlchemyモデル: `*_models.py` (複数テーブル) または `*_model.py` (単一テーブル)
- 設定/起動: 単機能名 (`config.py`, `db.py`, `logging.py` など)

### ドメインプレフィックス
- `admin_*`: 管理機能
- `masters_*`: マスタ管理
- `orders_*`: 受注管理
- `inventory_*`: 在庫管理
- `allocations_*`: 引当管理

---

## 1. ルータ (backend/app/api/routes/)

| 旧ファイル名 | 新ファイル名 | 説明 |
|------------|------------|------|
| `admin.py` | `admin_router.py` | 管理機能ルータ |
| `admin_healthcheck.py` | `admin_healthcheck_router.py` | 管理ヘルスチェックルータ |
| `admin_presets.py` | `admin_presets_router.py` | 管理プリセットルータ |
| `admin_seeds.py` | `admin_seeds_router.py` | 管理シードルータ |
| `allocations.py` | `allocations_router.py` | 引当ルータ |
| `forecast.py` | `forecast_router.py` | 予測ルータ |
| `health.py` | `health_router.py` | ヘルスチェックルータ |
| `integration.py` | `integration_router.py` | 統合ルータ |
| `lots.py` | `lots_router.py` | ロットルータ |
| `masters.py` | `masters_router.py` | マスタルータ |
| `masters_bulk_load.py` | `masters_bulk_load_router.py` | マスタ一括ロードルータ |
| `masters_customers.py` | `masters_customers_router.py` | 顧客マスタルータ |
| `masters_products.py` | `masters_products_router.py` | 製品マスタルータ |
| `masters_suppliers.py` | `masters_suppliers_router.py` | サプライヤーマスタルータ |
| `masters_warehouses.py` | `masters_warehouses_router.py` | 倉庫マスタルータ |
| `orders_refactored.py` | `orders_router.py` | 受注ルータ (リファクタ版を統合) |
| `orders_validate.py` | `orders_validate_router.py` | 受注バリデーションルータ |
| `products.py` | `products_router.py` | 製品ルータ |
| `warehouse_alloc.py` | `warehouse_alloc_router.py` | 倉庫引当ルータ |

**変更対象**: 19ファイル

---

## 2. サービス (backend/app/services/)

| 旧ファイル名 | 新ファイル名 | 説明 |
|------------|------------|------|
| `allocations.py` | `allocations_service.py` | 引当サービス |
| `forecast.py` | `forecast_service.py` | 予測サービス |
| `forecast_matcher.py` | `forecast_matcher_service.py` | 予測マッチングサービス |
| `products.py` | `products_service.py` | 製品サービス |
| `quantity.py` | `quantity_service.py` | 数量変換サービス |
| `uow.py` | `uow_service.py` | Unit of Work サービス |
| `allocation_service.py` | (変更なし) | 既に命名規約に準拠 |
| `lot_service.py` | (変更なし) | 既に命名規約に準拠 |
| `order_service.py` | (変更なし) | 既に命名規約に準拠 |
| `seeds_service.py` | (変更なし) | 既に命名規約に準拠 |
| `orders/validation.py` | `orders/validation_service.py` | 受注バリデーションサービス |

**変更対象**: 7ファイル

---

## 3. リポジトリ (backend/app/repositories/)

| 旧ファイル名 | 新ファイル名 | 説明 |
|------------|------------|------|
| `products.py` | `products_repository.py` | 製品リポジトリ |
| `allocation_repository.py` | (変更なし) | 既に命名規約に準拠 |
| `order_repository.py` | (変更なし) | 既に命名規約に準拠 |
| `stock_repository.py` | (変更なし) | 既に命名規約に準拠 |

**変更対象**: 1ファイル

---

## 4. モデル (backend/app/models/)

### 方針: 複数テーブルを含むファイルは `*_models.py`

| 旧ファイル名 | 新ファイル名 | 説明 |
|------------|------------|------|
| `inventory.py` | `inventory_models.py` | 在庫関連モデル (Lot, StockMovement, ExpiryRule等) |
| `orders.py` | `orders_models.py` | 受注関連モデル (Order, OrderLine, Allocation等) |
| `masters.py` | `masters_models.py` | マスタモデル (Product, Customer, Supplier, Warehouse等) |
| `forecast.py` | `forecast_models.py` | 予測モデル |
| `logs.py` | `logs_models.py` | ログモデル |
| `base_model.py` | (変更なし) | 基底モデル (単機能) |

**変更対象**: 5ファイル

---

## 5. スキーマ (backend/app/schemas/)

| 旧ファイル名 | 新ファイル名 | 説明 |
|------------|------------|------|
| `admin.py` | `admin_schema.py` | 管理機能スキーマ |
| `admin_seeds.py` | `admin_seeds_schema.py` | 管理シードスキーマ |
| `allocations.py` | `allocations_schema.py` | 引当スキーマ |
| `common.py` | `common_schema.py` | 共通スキーマ |
| `forecast.py` | `forecast_schema.py` | 予測スキーマ |
| `integration.py` | `integration_schema.py` | 統合スキーマ |
| `inventory.py` | `inventory_schema.py` | 在庫スキーマ |
| `masters.py` | `masters_schema.py` | マスタスキーマ |
| `orders.py` | `orders_schema.py` | 受注スキーマ |
| `products.py` | `products_schema.py` | 製品スキーマ |
| `warehouses.py` | `warehouses_schema.py` | 倉庫スキーマ |
| `base.py` | (変更なし) | 基底スキーマ |

**変更対象**: 11ファイル

---

## 6. その他のファイル (変更なし)

### Core (backend/app/core/)
- `config.py` - 設定
- `database.py` - データベース接続
- `errors.py` - エラーハンドラ
- `logging.py` - ロギング設定

### API (backend/app/api/)
- `deps.py` - 依存性注入

### DB (backend/app/db/)
- `session.py` - セッション管理

### Domain (backend/app/domain/)
- ドメインロジック (変更なし)

### Middleware (backend/app/middleware/)
- `request_id.py` - リクエストIDミドルウェア

---

## 統計

| カテゴリ | 変更対象 | 変更なし | 合計 |
|---------|---------|---------|------|
| ルータ | 19 | 0 | 19 |
| サービス | 7 | 4 | 11 |
| リポジトリ | 1 | 3 | 4 |
| モデル | 5 | 1 | 6 |
| スキーマ | 11 | 1 | 12 |
| **合計** | **43** | **9** | **52** |

---

## Import更新の影響範囲

### 1. ルータのインポート更新

**影響ファイル**:
- `backend/app/main.py` - ルータのインポート
- `backend/app/api/routes/__init__.py` - ルータのエクスポート

### 2. サービスのインポート更新

**影響ファイル**:
- 各ルータファイル (19ファイル)
- 他のサービスファイル (相互依存がある場合)

### 3. リポジトリのインポート更新

**影響ファイル**:
- 各サービスファイル (11ファイル)

### 4. モデルのインポート更新

**影響ファイル**:
- `backend/app/models/__init__.py` - モデルのエクスポート
- 各ルータファイル (19ファイル)
- 各サービスファイル (11ファイル)
- 各リポジトリファイル (4ファイル)
- Alembicマイグレーション (`backend/alembic/env.py`)

### 5. スキーマのインポート更新

**影響ファイル**:
- `backend/app/schemas/__init__.py` - スキーマのエクスポート
- 各ルータファイル (19ファイル)
- 各サービスファイル (11ファイル)

---

## 実装手順

### Phase 1: 準備
1. ✅ 現状調査完了
2. ✅ リネームマッピング表作成
3. ⏳ OpenAPI比較スクリプト作成
4. ⏳ ベースラインopenapi.json生成

### Phase 2: リネーム (git mv)
1. ルータファイルのリネーム
2. サービスファイルのリネーム
3. リポジトリファイルのリネーム
4. モデルファイルのリネーム
5. スキーマファイルのリネーム

### Phase 3: Import更新
1. `__init__.py` ファイルの更新
2. ルータのインポート更新 (`main.py`, `routes/__init__.py`)
3. サービスのインポート更新 (各ルータ)
4. リポジトリのインポート更新 (各サービス)
5. モデルのインポート更新 (全体)
6. スキーマのインポート更新 (全体)

### Phase 4: 検証
1. `ruff check` 実行
2. `pytest` 実行
3. OpenAPI差分チェック
4. `docker compose up -d` 動作確認

### Phase 5: ドキュメント
1. README更新 (命名規約追記)
2. コミット & プッシュ

---

## 注意事項

1. **挙動不変**: すべての変更はファイル名とimportのみで、ロジックは一切変更しません
2. **git mv使用**: リネームは`git mv`で履歴を保持します
3. **段階的コミット**: Phase毎にコミットを分けます
4. **OpenAPI不変**: OpenAPIスキーマに差分が出ないことを確認します
5. **循環依存**: `typing.TYPE_CHECKING`と遅延インポートで解決します

---

## 更新日

2025-11-10
