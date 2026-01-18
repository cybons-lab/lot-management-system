# テストデータ生成計画書（オリジナル・入荷予定・受注管理・マッピング）

**バージョン**: v1.0
**作成日**: 2026-01-17
**ステータス**: Draft

---

## 目次

1. [背景と目的](#1-背景と目的)
2. [対象範囲](#2-対象範囲)
3. [設計原則](#3-設計原則)
4. [データセット別の生成方針](#4-データセット別の生成方針)
5. [スケール・プリセット](#5-スケールプリセット)
6. [エッジケース設計](#6-エッジケース設計)
7. [検証と品質保証](#7-検証と品質保証)
8. [実装ロードマップ](#8-実装ロードマップ)

---

## 1. 背景と目的

本計画書は、既存のテストデータ生成方針（`test-data-generation-plan.md`）と同等の粒度で、
以下の領域に特化したテストデータ生成の設計・シナリオを定義する。

- **オリジナルデータ**（基礎マスタ・外部連携の起点となるデータ）
- **入荷予定**（Inbound Plans）
- **受注管理**（Orders / Order Lines）
- **マッピングデータ**
  - 得意先品番マッピング（Customer Item Mapping）
  - 仕入先別製品設定（Supplier Product Settings）

### 目的

1. 業務フローの起点データを安定供給し、E2E/結合テストを再現可能にする。
2. マッピングの未設定や矛盾に対する警告・例外処理を検証できるようにする。
3. 受注〜入荷〜在庫の一連のデータ整合性を保証する。

---

## 2. 対象範囲

| データ領域 | 主なテーブル / リソース | 目的 |
| --- | --- | --- |
| オリジナル | customers / suppliers / products / warehouses / delivery_places / product_uom_conversions | 基礎マスタの安定生成 |
| 入荷予定 | inbound_plans / inbound_plan_lines / expected_lots | 入荷計画とロット連携の検証 |
| 受注管理 | orders / order_lines / order_groups | 受注〜割当の整合性検証 |
| マッピング | customer_items / product_mappings / customer_item_jiku_mappings / customer_item_delivery_settings / product_suppliers | 得意先品番・仕入先別製品の整合性検証 |

---

## 3. 設計原則

### 3.1 データセットモード

| モード | 方針 | 主な用途 |
| --- | --- | --- |
| **strict** | 参照整合性100%、正規の業務ルールのみ | CI/通常テスト |
| **relaxed** | 一部警告（マッピング未設定など）を許容 | 例外処理・警告検証 |
| **invalid_only** | 破壊データのみ | バリデーションテスト |

### 3.2 再現性

```python
REPRODUCIBILITY_KEYS = {
    "seed": 42,
    "base_date": "2025-01-15",
    "version": "1.0",
}
```

### 3.3 生成順序（依存関係）

1. **オリジナル（基礎マスタ）**
2. **マッピング（得意先品番/仕入先別製品）**
3. **受注管理**
4. **入荷予定**

---

## 4. データセット別の生成方針

### 4.1 オリジナルデータ（基礎マスタ）

#### 4.1.1 生成対象

- customers（得意先）
- suppliers（仕入先）
- products（製品）
- warehouses（倉庫）
- delivery_places（納入先）
- product_uom_conversions（単位換算）

#### 4.1.2 生成ルール

- 顧客・仕入先・製品の **外部コード** は一意で、桁数ルールを維持する。
- 倉庫は `internal/external/supplier` の3タイプを最低1件ずつ含める。
- 納入先は顧客ごとに複数設定し、**次区（jiku_code）** を含む。
- 単位換算は `PCS/BOX/KG` を基準とし、数量換算の逆転が発生しないようにする。

```python
ORIGINAL_MASTER_SPECS = {
    "customers": {"min": 10, "with_delivery_places": 0.8},
    "suppliers": {"min": 8, "with_warehouse_type": True},
    "products": {"min": 40, "has_uom_conversion": 0.6},
    "warehouses": {"types": ["internal", "external", "supplier"]},
    "delivery_places": {"per_customer": (1, 3), "with_jiku": 0.9},
}
```

### 4.2 入荷予定データ

#### 4.2.1 生成対象

- inbound_plans
- inbound_plan_lines
- expected_lots（任意）

#### 4.2.2 生成ルール

- 仕入先ごとに月次の入荷予定を持つ。
- `planned_arrival_date` は `base_date` から **+7〜+45日** の範囲。
- `expected_lots` は **50%の明細** にのみ紐づけ、ロット未指定のケースも再現。
- `planned_quantity` は製品の標準単位に合わせる。

```python
INBOUND_PLAN_SPECS = {
    "plans_per_supplier": (1, 4),
    "lines_per_plan": (2, 6),
    "arrival_window_days": (7, 45),
    "expected_lot_ratio": 0.5,
}
```

### 4.3 受注管理データ

#### 4.3.1 生成対象

- orders
- order_lines
- order_groups（任意）

#### 4.3.2 生成ルール

- 注文は顧客単位で作成し、**同一注文日の複数明細**を持つ。
- `delivery_date` は `order_date` から **+2〜+30日**。
- `order_groups` は **同一製品・同一顧客** を束ねたまとまりを持たせる。
- 注文単位は `product_uom_conversions` に合わせる。

```python
ORDER_MANAGEMENT_SPECS = {
    "orders_per_customer": (3, 12),
    "lines_per_order": (1, 5),
    "delivery_window_days": (2, 30),
    "grouping_ratio": 0.4,
}
```

### 4.4 マッピングデータ

#### 4.4.1 得意先品番マッピング

**対象テーブル**: `customer_items`, `product_mappings`, `customer_item_jiku_mappings`, `customer_item_delivery_settings`

- 得意先×製品の **80%** をマッピング対象とする。
- `customer_item_jiku_mappings` は、納入先の `jiku_code` と連動させる。
- `customer_item_delivery_settings` は、**納入先ごと** のLTや特記事項を含む。

```python
CUSTOMER_ITEM_MAPPING_SPECS = {
    "mapping_ratio": 0.8,
    "with_jiku_mapping": 0.7,
    "delivery_setting_ratio": 0.6,
}
```

#### 4.4.2 仕入先別製品設定

**対象テーブル**: `product_suppliers` (API名: supplier_products)

- 製品ごとに **1〜2社** の仕入先を持たせる。
- `is_primary` は製品ごとに必ず1件のみ `True`。
- `lead_time_days` は 7〜28日の範囲でバラつきを持たせる。

```python
SUPPLIER_PRODUCT_SPECS = {
    "suppliers_per_product": (1, 2),
    "primary_ratio": 1.0,
    "lead_time_days_range": (7, 28),
}
```

---

## 5. スケール・プリセット

| プリセットID | オリジナル | 受注 | 入荷予定 | マッピング | 用途 |
| --- | --- | --- | --- | --- | --- |
| **quick** | 顧客10 / 製品30 | 200件 | 50件 | 60% | 開発用ミニセット |
| **full_coverage** | 顧客30 / 製品120 | 2,000件 | 500件 | 80% | 総合テスト |
| **warning_focus** | 顧客20 / 製品80 | 800件 | 300件 | 50% | マッピング未設定警告 |
| **invalid_only** | 0 | 0 | 0 | 0 | 破壊データのみ |

---

## 6. エッジケース設計

### 6.1 オリジナル

- **倉庫タイプ欠落**（relaxed）: `supplier` タイプが未生成。
- **納入先欠落**（relaxed）: 顧客に納入先が存在しない。

### 6.2 入荷予定

- **同一明細に重複ロット**（invalid_only）
- **予定日が過去**（relaxed）

### 6.3 受注管理

- **delivery_date < order_date**（invalid_only）
- **注文単位と換算単位不整合**（invalid_only）

### 6.4 マッピング

- **得意先品番未マッピング**（relaxed）
- **is_primaryが複数**（invalid_only）
- **product_mappingsの顧客/仕入先/製品が不一致**（invalid_only）

---

## 7. 検証と品質保証

### 7.1 一貫性チェック

- `orders.customer_id` は `customers.id` と一致する。
- `order_lines.product_id` は `products.id` と一致する。
- `inbound_plan_lines.product_id` は `products.id` と一致する。
- `product_suppliers.product_id` は `products.id` と一致する。
- `product_suppliers.supplier_id` は `suppliers.id` と一致する。

### 7.2 マッピング整合性

- 得意先品番（`customer_items.external_product_code`）は顧客内でユニーク。
- `customer_item_jiku_mappings` が示す納入先は同一顧客に属する。
- `customer_item_delivery_settings` は `delivery_places` と整合する。

### 7.3 サンプル検証SQL（例）

```sql
-- 仕入先別製品設定のprimary重複
SELECT product_id, COUNT(*)
FROM product_suppliers
WHERE is_primary = true
GROUP BY product_id
HAVING COUNT(*) > 1;
```

---

## 8. 実装ロードマップ

1. **Phase 1**: オリジナルデータの生成器追加
2. **Phase 2**: マッピング生成器（得意先品番・仕入先別製品）
3. **Phase 3**: 受注管理生成器
4. **Phase 4**: 入荷予定生成器
5. **Phase 5**: 検証SQLとCI組み込み

