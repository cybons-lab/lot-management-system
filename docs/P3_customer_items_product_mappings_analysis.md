# P3 Customer Items / Product Mappings 設計分析

**作成日**: 2025-12-14  
**ステータス**: 完了（案C採用）  
**対象**: customer_items, product_mappings テーブルの重複/責務整理

---

## 1. 現状分析

### 1.1 テーブル比較

| 観点 | customer_items | product_mappings |
|------|----------------|------------------|
| **PK** | 複合PK (customer_id, external_product_code) | BIGSERIAL (id) |
| **目的** | 得意先品番マッピング | 4者関係マッピング（得意先+先方品番+製品+仕入先） |
| **supplier_id** | nullable (SET NULL) | NOT NULL (CASCADE) |
| **customer_part_code** | external_product_code | customer_part_code |
| **unit系** | base_unit, pack_unit, pack_quantity | base_unit, pack_unit, pack_quantity |
| **拡張カラム** | special_instructions, shipping_document_template, sap_notes | special_instructions |
| **論理削除** | valid_to (SoftDeleteMixin) | valid_to (SoftDeleteMixin) |
| **関連テーブル** | jiku_mappings, delivery_settings | なし |

### 1.2 実際の利用状況分析

| テーブル | ビューでの使用 | 業務ロジックでの使用 | 推定重要度 |
|----------|----------------|---------------------|------------|
| customer_items | ✅ v_order_line_details | 受注明細に仕入先情報を紐付け | **高** |
| product_mappings | ❌ 使用なし | なし（マスタ管理のみ） | **低** |

---

## 2. 設計案一覧

### 案A: customer_items に統合
- **メリット**: 変更影響が最小限
- **デメリット**: 複合PKが扱いにくい
- **影響範囲**: 約10ファイル

### 案B: product_mappings を正に
- **メリット**: BIGSERIAL PKで参照が容易
- **デメリット**: ビュー修正、移行が複雑
- **影響範囲**: 約27ファイル + ビュー修正

### 案C: 役割明確化（採用）
- **メリット**: 既存機能への影響なし、将来拡張性維持
- **デメリット**: データ重複の可能性
- **影響範囲**: ドキュメントのみ

---

## 3. 決定事項

**案C（役割明確化）を採用**

| テーブル | 責務 | ドメイン |
|----------|------|----------|
| `customer_items` | 得意先別品番設定 + 出荷設定 | 受注・出荷 |
| `product_mappings` | 4者マッピング（調達用） | 調達・発注 |

---

## 4. 影響範囲サマリ

### customer_items 参照ファイル（主要）

- `masters_models.py` - モデル定義
- `customer_items_router.py` - CRUD API
- `customer_items_service.py` - ビジネスロジック
- `create_views.sql` - v_order_line_details

### product_mappings 参照ファイル（主要）

- `masters_models.py` - モデル定義
- `product_mappings_router.py` - CRUD API
- `import_service.py` - マスタインポート

---

## 参考資料

- [ADR-003](adr/ADR-003_customer_items_product_mappings.md) - 設計判断記録
- [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md) - 責務境界ガイド
