# Phase1 Cleanup Tasks - 不要カラム削除対応

## 概要

マイグレーション `b2cabaab67f5` で `customer_items` テーブルから以下のカラムを削除しました:
- `product_group_id` → `supplier_item_id` に統合
- `supplier_id` → `supplier_item.supplier` リレーション経由でアクセス
- `is_primary` → Phase1では不要

**現状:** DBは正しく更新済みだが、コードに古い参照が69ファイル残っている

**影響:** mypy、pre-commitフックが失敗。一部機能（担当仕入先など）が動作しない可能性

**期限:** 午後一の動作確認までに修正必須

---

## 修正パターン

### パターン1: `product_group_id` → `supplier_item_id`

```python
# BEFORE
item.product_group_id

# AFTER
item.supplier_item_id
```

### パターン2: `supplier_id` → リレーション経由

```python
# BEFORE
item.supplier_id

# AFTER
item.supplier_item.supplier_id if item.supplier_item else None
```

### パターン3: `is_primary` → 削除

```python
# BEFORE
.filter(CustomerItem.is_primary == True)

# AFTER
# Phase1では全てのcustomer_itemsが等価なので、is_primaryフィルタは不要
# 単にフィルタを削除するか、別のロジックに置き換える
```

### パターン4: クエリの JOIN

```python
# BEFORE
.join(SupplierItem, CustomerItem.product_group_id == SupplierItem.id)

# AFTER
.join(SupplierItem, CustomerItem.supplier_item_id == SupplierItem.id)
```

---

## 修正対象ファイル (優先度順)

### 🔴 P0 - 即座に修正（mypy error）

1. **app/application/services/ocr/ocr_sap_complement_service.py** (2箇所)
   - Line 142: `item.product_group_id` → `item.supplier_item_id`
   - Line 203: `item.product_group_id` → `item.supplier_item_id`
   - `resolve_product_group_id()` メソッドも `resolve_supplier_item_id()` にリネーム推奨

2. **app/application/services/allocations/mapping_validator.py** (1箇所)
   - Line 152: `CustomerItem.is_primary` → 削除または代替ロジック

3. **app/application/services/master_import/import_service.py** (2箇所)
   - Line 353: `product_group_id` → `supplier_item_id`
   - Line 354: `supplier_id` → リレーション経由

4. **app/application/services/masters/customer_items_service.py** (2箇所)
   - Line 405: `product_group_id` → `supplier_item_id`
   - Line 406: `supplier_id` → リレーション経由

5. **app/infrastructure/persistence/repositories/customer_item_delivery_setting_repository.py** (1箇所)
   - Line 113: `CustomerItem.product_group_id` → `CustomerItem.supplier_item_id`

6. **app/presentation/api/v2/withdrawals/default_destination_router.py** (2箇所)
   - Line 78: `CustomerItem.product_group_id` → `CustomerItem.supplier_item_id`
   - Line 80: `CustomerItem.supplier_id` → リレーション経由

7. **app/application/services/rpa/orchestrator.py** (2箇所)
   - Line 531: `product_group_id` → `supplier_item_id`
   - Line 532: `supplier_id` → リレーション経由

8. **app/presentation/api/routes/masters/status_router.py** (2箇所)
   - Line 31: `CustomerItem.supplier_id` → リレーション経由
   - Line 51: `CustomerItem.supplier_id` → リレーション経由

### 🟡 P1 - 重要（機能に影響）

9. app/application/services/orders/order_service.py
10. app/application/services/inventory/inbound_service.py
11. app/application/services/inventory/inventory_service.py
12. app/application/services/allocations/auto.py
13. app/application/services/allocations/search.py
14. app/application/services/allocations/suggestion_base.py
15. app/application/services/allocations/suggestion.py
16. app/application/services/allocations/manual.py
17. app/application/services/allocations/group_suggestion.py
18. app/application/services/allocations/period_suggestion.py

### 🟢 P2 - 通常（テストデータ生成等）

20-28. app/application/services/test_data/*.py (7ファイル)
29-35. その他のサービス層

### ⚪ P3 - 低優先度（スクリプト、古いAPI等）

36. app/scripts/phase1_audit.py
37. app/scripts/phase1_backfill_mapping.py
38-69. その他のファイル

---

## 修正手順

### Step 1: P0ファイルを修正 (最優先)

```bash
# mypy errorが出ている8ファイルを修正
# 各ファイルで検索: product_group_id, supplier_id, is_primary
```

### Step 2: pre-commitフックを通す

```bash
cd backend
ruff check app/ --fix
ruff format app/
mypy app/
```

### Step 3: P1ファイルを修正

担当仕入先機能など、重要な機能に影響するファイルを修正

### Step 4: テスト実行

```bash
docker compose exec backend pytest tests/
```

### Step 5: 動作確認

- 得意先品番マスタ CRUD
- 担当仕入先機能
- 注文作成・割当
- OCR連携

---

## 検証コマンド

```bash
# 残りの参照を検索
grep -r "\.product_group_id" backend/app/
grep -r "\.supplier_id" backend/app/ | grep -v "supplier_item\.supplier_id"
grep -r "\.is_primary" backend/app/ | grep -v "supplier_items\.is_primary"

# mypy確認
docker compose exec backend mypy app/

# customer_items作成テスト
curl -X POST http://localhost:8000/api/masters/customer-items \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "customer_part_no": "TEST-002", "supplier_item_id": 2, "base_unit": "個"}'
```

---

## 注意事項

### supplier_id のアクセス

```python
# ❌ BAD: 直接アクセス（カラム削除済み）
customer_item.supplier_id

# ✅ GOOD: リレーション経由
customer_item.supplier_item.supplier_id if customer_item.supplier_item else None

# ✅ GOOD: JOINした場合
query = (
    db.query(CustomerItem)
    .join(CustomerItem.supplier_item)
    .options(joinedload(CustomerItem.supplier_item).joinedload(SupplierItem.supplier))
)
# その後 customer_item.supplier_item.supplier_id でアクセス
```

### is_primary の扱い

Phase1では `is_primary` の概念は不要になりました。
- 以前: 1つの製品に複数の得意先品番があり、代表を決めていた
- Phase1以降: `customer_items` は単純に customer ↔ supplier_item のマッピング

フィルタを削除するか、別のロジック（例: created_at順、id順）に置き換えてください。

### テストデータ生成

`app/application/services/test_data/masters.py` 等でも修正が必要です。
テストデータ生成が失敗すると、開発環境のリセットができなくなります。

---

## 完了チェックリスト

- [ ] P0ファイル8個を修正
- [ ] mypy 0 errors
- [ ] ruff check 通過
- [ ] P1ファイル修正
- [ ] pytest 通過
- [ ] 得意先品番マスタ CRUD 動作確認
- [ ] 担当仕入先機能 動作確認
- [ ] コミット & プッシュ

---

## 参考

- マイグレーション: `backend/alembic/versions/b2cabaab67f5_remove_obsolete_customer_items_columns.py`
- モデル定義: `backend/app/infrastructure/persistence/models/masters_models.py`
- スキーマ定義: `backend/app/presentation/schemas/masters/customer_items_schema.py`
- 調査レポート: `/private/tmp/claude/.../migration-investigation-report.md`
