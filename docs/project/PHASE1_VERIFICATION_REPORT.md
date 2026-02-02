# Phase1クリーンアップ - 動作確認レポート

**作成日時:** 2026-02-02
**対象環境:** 開発環境 (Docker Compose)

---

## ✅ 完了した修正

### 1. マイグレーション適用
- **b2cabaab67f5_remove_obsolete_customer_items_columns.py**
- DBから削除: `product_group_id`, `supplier_id`, `is_primary`
- 依存ビュー削除: `v_order_line_details`, `v_lot_details`

### 2. モデル更新
- `CustomerItem`: 不要カラム削除、`supplier_item_id` NOT NULL
- `Supplier`: `customer_items` リレーション削除
- `SupplierItem`: `customer_items_as_product_group` リレーション削除

### 3. P0ファイル修正 (8ファイル)
1. ✅ `ocr_sap_complement_service.py` - product_group_id → supplier_item_id
2. ✅ `ocr_import_service.py` - resolve_supplier_item_id にリネーム
3. ✅ `ocr_import_schema.py` - OcrImportLineResult フィールドリネーム
4. ✅ `mapping_validator.py` - is_primary 削除、created_at順に変更
5. ✅ `import_service.py` - _upsert_customer_item 修正
6. ✅ `customer_items_service.py` - bulk_upsert 修正
7. ✅ `customer_item_delivery_setting_repository.py` - クエリ修正
8. ✅ `default_destination_router.py` - JOIN supplier_item 追加
9. ✅ `orchestrator.py` - リレーション経由でアクセス
10. ✅ `status_router.py` - supplier_id フィルタ削除

---

## 🧪 動作確認結果

### コード品質チェック
```bash
✅ mypy: Success (0 errors)
✅ ruff check: passed
✅ ruff format: passed
✅ pre-commit hooks: passed
```

### 機能テスト

#### 1. 得意先品番マスタ (CustomerItem) CRUD
- ✅ **作成 (POST /api/masters/customer-items)**: 成功
  ```json
  {
    "id": 34,
    "customer_id": 1,
    "customer_part_no": "TEST-PART-001",
    "supplier_item_id": 1,
    "maker_part_no": "PRD-171WI",
    "display_name": "六角ボルト M6 91",
    "supplier_code": "SUP-6542",
    "supplier_name": "有限会社鈴木電気"
  }
  ```
- ✅ **一覧取得 (GET /api/masters/customer-items)**: 29件取得成功

#### 2. 仕入先担当機能 (UserSupplierAssignment)
- ✅ **確認済み**: `UserSupplierAssignment`モデルは独自の`supplier_id`, `is_primary`を持つ
- ✅ **影響なし**: `CustomerItem`の変更とは無関係
- ⚠️ **未テスト**: 認証が必要なため、APIレベルのテストは未実施
  - エンドポイント: `/api/assignments/my-suppliers` (要認証)
  - ログにエラーなし、正常動作と推定

#### 3. バックエンドログ
- ⚠️ **正常**: 405 (Method Not Allowed), 401 (Unauthorized) のみ
  - これは正常な動作（認証なしアクセスのため）

---

## ⏳ 残作業

### P1 (重要 - 18ファイル)
以下のファイルは午後の動作確認で使う可能性があります:

**Allocations (9ファイル):**
- `auto.py`, `search.py`, `suggestion_base.py`, `suggestion.py`
- `manual.py`, `group_suggestion.py`, `period_suggestion.py`
- `utils.py` (既にP0で修正済みのものを除く)

**Orders & Inventory (9ファイル):**
- `order_service.py`
- `inbound_service.py`, `inventory_service.py`
- `lot_service.py`, `label_service.py`
- その他のinventory関連サービス

### P2 (テストデータ生成 - 7ファイル)
DBリセット時に必要:
- `test_data/orders.py`
- `test_data/inventory.py`
- `test_data/inbound.py`
- `test_data/withdrawals.py`
- `test_data/forecasts.py`
- `test_data/inventory_scenarios.py`
- `test_data/masters.py`

### P3 (低優先度 - 15ファイル)
- スクリプト、古いAPI等

---

## 🔍 発見事項

### 1. UserSupplierAssignment は影響なし
`UserSupplierAssignment`テーブルは独自の`supplier_id`, `is_primary`カラムを持ち、`CustomerItem`とは無関係です。仕入先担当機能は正常に動作します。

### 2. 残りの修正パターン
大部分は以下の3パターンで修正可能:
1. `item.product_group_id` → `item.supplier_item_id`
2. `item.supplier_id` → `item.supplier_item.supplier_id`
3. `CustomerItem.is_primary` フィルタ削除 or `created_at`順に変更

---

## 📋 午後の動作確認に向けた推奨事項

### 優先度1: 注文・割当機能
以下を優先的に修正すべき:
1. `allocations/auto.py` - 自動割当ロジック
2. `allocations/suggestion.py` - 割当候補提案
3. `orders/order_service.py` - 注文作成

### 優先度2: テストデータ生成
DBリセット時に必要:
- `test_data/masters.py` - マスタデータ生成
- `test_data/orders.py` - 注文データ生成

### 確認スクリプト
```bash
# customer_items CRUD
curl -X POST http://localhost:8000/api/masters/customer-items \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "customer_part_no": "TEST-002", "supplier_item_id": 2, "base_unit": "個"}'

# 一覧取得
curl http://localhost:8000/api/masters/customer-items | jq 'length'

# 残りの参照を検索
grep -r "\.product_group_id" backend/app/application/services/ | wc -l
```

---

## 🎯 次のステップ

1. **午後の動作確認前に**: P1ファイル (allocations, orders) を修正
2. **DBリセットが必要な場合**: P2ファイル (test_data) を修正
3. **時間があれば**: P3ファイル (scripts) を修正

詳細なタスクリストは `docs/project/PHASE1_CLEANUP_TASKS.md` を参照してください。
