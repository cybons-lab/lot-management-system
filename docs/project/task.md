# Task Backlog (Phase 2以降)

## 概要
Phase 2 完了後に残存する課題を管理するファイル。

---

## P1: Phase 2-2 で対応予定

### 1. customer_items API テスト修正

**ファイル**: `backend/tests/api/test_customer_items.py`

**根本原因**: Phase 2 スキーマ変更により、`external_product_code` → `customer_part_no` にリネームされたが、テストコードが旧スキーマのまま。

**失敗テスト一覧** (9件):

| テスト名 | エラー種別 | 説明 |
|---------|-----------|------|
| `test_list_customer_items_with_filters` | TypeError | `external_product_code` は無効なキーワード |
| `test_list_customer_items_by_customer` | TypeError | 同上 |
| `test_create_customer_item_success` | 422 != 201 | スキーマ不一致 |
| `test_create_customer_item_duplicate_returns_409` | TypeError | `external_product_code` は無効なキーワード |
| `test_update_customer_item_success` | TypeError | 同上 |
| `test_update_customer_item_not_found` | 405 != 404 | ルーティング不一致 |
| `test_delete_customer_item_success` | TypeError | `external_product_code` は無効なキーワード |
| `test_delete_customer_item_not_found` | 405 != 404 | ルーティング不一致 |
| `test_bulk_upsert_customer_items` | TypeError | `external_product_code` は無効なキーワード |

**修正方針**:
1. `external_product_code` → `customer_part_no` にリネーム
2. APIルーティングの確認（PUT/DELETE エンドポイントパス）
3. `supplier_item_id` への紐付け対応（Phase 2 新スキーマ）

---

## P2: Phase 3 以降で対応予定

### 1. external_product_code 残存参照のクリーンアップ

**残存ファイル数**: 34件 (grep結果)

**カテゴリ別内訳**:
- **テストファイル** (2件): 上記P1で対応
- **アーカイブ済みマイグレーション** (6件): 履歴保持のため放置可
- **スキーマダンプ** (3件): 再生成で解消
- **アプリケーションコード** (23件): 要リネーム

**主要対応ファイル**:
- `app/presentation/schemas/masters/customer_items_schema.py`
- `app/application/services/masters/customer_items_service.py`
- `app/presentation/api/routes/masters/customer_items_router.py`
- `app/infrastructure/persistence/models/orders_models.py`
- `app/presentation/schemas/orders/orders_schema.py`
- `app/presentation/schemas/import_schema.py`
- `app/application/services/ocr/ocr_import_service.py`

**方針**: Phase 3 でAPI互換性を維持しつつ段階的にリネーム。フロントエンドとの同期が必要。

---

## 完了タスク

- [x] Phase 2-1: supplier_items.product_id NULLABLE確認 (2026-01-25)
- [x] Phase 2-1: customer_items.is_primary 追加 (2026-01-25)
- [x] Phase 2-1: v_lot_details に mapping_status 追加 (2026-01-25)
- [x] Phase 2-1: mapping_validator.py 導入 (strict=False) (2026-01-25)
- [x] SSOT統一: migrations → create_views.sql (2026-01-25)
- [x] Alembic downgrade/upgrade 検証 (2026-01-25)
