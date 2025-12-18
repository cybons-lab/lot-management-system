# スキーマガイド: テーブル責務境界

**最終更新**: 2025-12-14  
**関連ADR**: [ADR-003](adr/ADR-003_customer_items_product_mappings.md)

---

## 概要

本ガイドでは、品番マッピング関連テーブルの責務境界を定義します。
開発時にどのテーブルを使用すべきか迷った場合の判断基準を提供します。

---

## テーブル責務一覧

### 受注・出荷ドメイン

| テーブル | 責務 | 使用場面 |
|----------|------|----------|
| `customer_items` | 得意先別品番設定 + 出荷設定 | 受注明細、出荷表生成、SAP連携 |
| `customer_item_jiku_mappings` | 次区コード→納入先マッピング | 次区別の納入先解決 |
| `customer_item_delivery_settings` | 納入先別出荷設定 | 出荷表テキスト生成、梱包注意書き |

### 調達・発注ドメイン

| テーブル | 責務 | 使用場面 |
|----------|------|----------|
| `product_mappings` | 4者マッピング（得意先+先方品番+製品+仕入先） | 発注先決定、仕入先別単価管理（将来） |
| `product_suppliers` | 製品-仕入先関係 | 主要仕入先管理、リードタイム |
| `product_uom_conversions` | 単位換算 | 製品別の外部単位→内部単位変換 |

---

## 責務境界図

```
[受注・出荷ドメイン]
├── customer_items（得意先品番マッピング）
│   ├── 得意先が使用する品番コードの変換
│   ├── 出荷表テキスト、梱包注意書き
│   └── 次区・納入先ごとの設定
│
└── 参照: v_order_line_details, 出荷表生成処理

[調達ドメイン]
├── product_mappings（4者マッピング）
│   ├── 顧客+先方品番+製品+仕入先の組み合わせ管理
│   └── 将来: 仕入先別単価、リードタイム
│
├── product_suppliers（製品-仕入先関係）
│   └── 主要仕入先の管理
│
└── 参照: 発注処理、仕入先選定ロジック（将来）
```

---

## 迷ったときの判断ルール

### どのテーブルを使うべきか？

1. **受注/出荷処理で品番変換が必要な場合**
   → `customer_items` を使用

2. **出荷表や納品書のテキスト生成が必要な場合**
   → `customer_item_delivery_settings` を使用

3. **次区コードから納入先を解決したい場合**
   → `customer_item_jiku_mappings` を使用

4. **仕入先を決定する調達処理を実装する場合**
   → `product_mappings` を使用

5. **製品の主要仕入先を取得したい場合**
   → `product_suppliers` を使用

### 新機能開発時のガイドライン

- **受注・出荷系の機能**: `customer_items` とその関連テーブルを使用
- **調達・発注系の機能**: `product_mappings`, `product_suppliers` を使用
- **どちらにも該当しない場合**: ADRを更新して責務を明確にする

---

## テーブル詳細

### customer_items

```
PK: 複合PK (customer_id, external_product_code)
FK: customer_id → customers(id)
    product_id → products(id)
    supplier_id → suppliers(id) [nullable]

カラム:
- external_product_code: 得意先が使用する品番
- base_unit: 基本単位
- pack_unit, pack_quantity: 梱包単位
- special_instructions: 特記事項
- shipping_document_template: 出荷表テンプレート
- sap_notes: SAP連携用メモ
```

### product_mappings

```
PK: BIGSERIAL (id)
FK: customer_id → customers(id)
    supplier_id → suppliers(id) [NOT NULL]
    product_id → products(id)
UNIQUE: (customer_id, customer_part_code, supplier_id)

カラム:
- customer_part_code: 先方品番
- base_unit: 基本単位
- pack_unit, pack_quantity: 梱包単位
- special_instructions: 特記事項
```

### product_suppliers

```
PK: BIGSERIAL (id)
FK: product_id → products(id)
    supplier_id → suppliers(id)
UNIQUE: (product_id, supplier_id)

カラム:
- is_primary: 主要仕入先フラグ
- lead_time_days: リードタイム（日）
```

---

## 参照

- [ADR-003: customer_items / product_mappings の責務分離](adr/ADR-003_customer_items_product_mappings.md)
- [P3分析レポート](P3_customer_items_product_mappings_analysis.md)
