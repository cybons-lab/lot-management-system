# P0/P1 スキーマ修正 成果物レポート

**作成日**: 2025-12-13
**対象コミット**: `ba296a39` - feat: 仮入庫対応・P0/P1スキーマ修正・マイグレーション統合

---

## 1. 変更概要（設計判断含む）

### 実施したP0修正

| 項目 | 問題 | 解決策 | 設計判断 |
|------|------|--------|----------|
| **allocations lot_id** | `lot_reference` (String) と `lot_id` (FK) の二重定義 | `lot_id` FK に統一 | 参照整合性を維持しつつ、`lot_number` はプロパティで取得 |
| **withdrawals nullable** | モデル (nullable=True) とDB (nullable=False) の不整合 | `nullable=True` に統一 | 出庫タイプによってcustomer_id等が不要なケースに対応 |
| **旧ビュー参照** | `lots.allocated_quantity` への参照残存 | `lot_reservations` ベースの集計に移行 | `v_lot_allocations` ビューで動的計算 |

### 実施したP1修正

| 項目 | 問題 | 解決策 |
|------|------|--------|
| **マイグレーション統合** | 複数の個別マイグレーションが複雑化 | 全てを `000000000000_initial_schema.py` に統合 |
| **仮入庫対応** | 仮ロット番号でのロット登録対応 | `lots.temporary_lot_key` (UUID) カラム追加 |

### 設計判断のポイント

1. **`allocations.lot_id` FK 維持の理由**
   - 当初の `decoupling-migration-plan.md` では `lot_reference` (String) への置換を計画
   - 実装では `lot_id` FK を維持し、`lot_number` はプロパティで取得する方式に変更
   - **理由**: 参照整合性の維持、JOINパフォーマンス向上

2. **マイグレーション統合の目的**
   - 複雑化していた個別マイグレーションを単一ファイルに集約
   - モデルから自動生成 (`alembic revision --autogenerate`)
   - DBリセット時のクリーンスタートを容易に

---

## 2. 追加/変更した Alembic マイグレーション

### 統合マイグレーション

[000000000000_initial_schema.py](file:///d:/Work/Lot-management-system/backend/alembic/versions/000000000000_initial_schema.py)

**削除されたマイグレーション**:
- `18dcee2f69a3_add_user_supplier_assignments.py`
- `19cf5314f970_schema_improvements_version_and_views.py`
- `f3e7b6fd7de7_add_provisional_stock_to_inventory_view.py`
- `20241209_add_withdrawals.py`
- `20241210_add_lot_reservations.py`
- `20241210_complete_migration.py`
- その他個別マイグレーション

**統合後の内容**（38テーブル + ビュー作成）:
- 全テーブル定義（マスタ、受注、在庫、引当、出荷、入荷、予測、ユーザー、システム）
- 全制約（CHECK、UNIQUE、FK）
- 全インデックス
- ビュー作成SQLの自動実行

---

## 3. 修正されたファイル一覧

### モデル

| ファイル | 変更内容 |
|----------|----------|
| [orders_models.py](file:///d:/Work/Lot-management-system/backend/app/infrastructure/persistence/models/orders_models.py) | `Allocation.lot_id` FK追加、`lot_reference` をプロパティに変更 |
| [inventory_models.py](file:///d:/Work/Lot-management-system/backend/app/infrastructure/persistence/models/inventory_models.py) | `Lot.temporary_lot_key` 追加 |
| [withdrawal_models.py](file:///d:/Work/Lot-management-system/backend/app/infrastructure/persistence/models/withdrawal_models.py) | nullable設定の確認 |

### リポジトリ

| ファイル | 変更内容 |
|----------|----------|
| [allocation_repository.py](file:///d:/Work/Lot-management-system/backend/app/infrastructure/persistence/repositories/allocation_repository.py) | `lot_id` ベースのクエリに更新 |

### API

| ファイル | 変更内容 |
|----------|----------|
| router.py (v2/allocation) | レスポンス構築の更新 |

### SQL

| ファイル | 変更内容 |
|----------|----------|
| [create_views.sql](file:///d:/Work/Lot-management-system/backend/sql/views/create_views.sql) | `v_lot_allocations` を `lot_reservations` ベースに更新 |

### テスト

| ファイル | 変更内容 |
|----------|----------|
| test_temporary_lot.py | 仮入庫機能のテスト追加 |
| test_bulk_cancel.py | 引当キャンセルテストの更新 |

### その他

| ファイル | 変更内容 |
|----------|----------|
| [migration-safety.md](file:///d:/Work/Lot-management-system/.agent/workflows/migration-safety.md) | マイグレーション安全手順のワークフロー追加 |
| openapi.json | API仕様の更新 |
| api.d.ts | フロントエンド型定義の更新 |

---

## 4. 現在のスキーマ状態まとめ

### テーブル構成（38テーブル）

```
マスタ系 (6)
├── customers, suppliers, warehouses, products, delivery_places, roles

品番マッピング (6)
├── customer_items, customer_item_jiku_mappings, customer_item_delivery_settings
├── product_mappings, product_uom_conversions, product_suppliers

受注系 (3)
├── orders, order_lines, order_groups

在庫系 (4)
├── lots, expected_lots, stock_history, adjustments

引当系 (4)
├── allocations, allocation_suggestions, allocation_traces, lot_reservations

出荷系 (1)
├── withdrawals

入荷系 (2)
├── inbound_plans, inbound_plan_lines

予測系 (2)
├── forecast_current, forecast_history

ユーザー・権限 (3)
├── users, user_roles, user_supplier_assignments

システム (7)
├── system_configs, system_client_logs, operation_logs
├── master_change_logs, batch_jobs, business_rules, seed_snapshots
```

### 主要テーブルの現在の状態

| テーブル | 状態 | 備考 |
|----------|------|------|
| `lots` | ✅ 正常 | `allocated_quantity` 削除済み、`temporary_lot_key` 追加済み |
| `allocations` | ✅ 正常 | `lot_id` FK使用、`lot_reference` はプロパティ |
| `lot_reservations` | ✅ 正常 | 新方式の予約管理テーブル |
| `withdrawals` | ✅ 正常 | nullable設定が正しい |
| `order_lines` | ✅ 正常 | `forecast_reference` (String) 使用 |

### ビュー構成

| ビュー | 目的 |
|--------|------|
| `v_lot_allocations` | ロットごとの引当数量集計（`lot_reservations` ベース） |
| `v_lot_available_qty` | 利用可能在庫計算 |
| `v_inventory_summary` | 在庫サマリ（仮在庫含む） |
| `v_lot_details` | ロット詳細（担当者情報含む） |
| `v_order_line_details` | 受注明細詳細 |
| その他12ビュー | マスタ変換、コンテキスト情報等 |

---

## 5. 次フェーズ（中程度問題）への準備

### 残存する中程度の問題（`schema_review_report.md` より）

| # | 項目 | 工数 |
|---|------|------|
| 4 | customer_items と product_mappings の重複 | 高 |
| 5 | 論理削除方式の不統一 | 中 |
| 6 | stock_history チェック制約とEnum不一致 | 低 |
| 7 | インデックス命名規則の不統一 | 中 |
| 8 | プライマリキー命名の不統一（conversion_id） | 中 |

### 中程度問題に進む前の確認事項

- [x] DBリセット・マイグレーション適用完了
- [x] ビュー作成完了
- [x] P0/P1問題の解決確認
- [ ] テストデータ投入（必要に応じて）
- [ ] アプリケーション動作確認

---

## 付録: コミット詳細

```
commit ba296a392a0b25572ea3a02bdec706adadcea7cf
Author: [Author]
Date: 2025-12-13

feat: 仮入庫対応・P0/P1スキーマ修正・マイグレーション統合

40 files changed, 1517 insertions(+), 1861 deletions(-)
```
