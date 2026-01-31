# 用語ガイド（Terminology Guide）

**重要:** データベースコメントを記述する際は、このガイドの用語を使用してください。

---

## 🔑 基本用語の対応表

### 日本語 ⇔ 英語

| 日本語 | 英語（DB） | テーブル/カラム | 備考 |
|--------|-----------|---------------|------|
| **仕入先** | Supplier | `suppliers` | 仕入元と同義 |
| **仕入先コード** | Supplier Code | `suppliers.supplier_code` | 仕入元コード |
| **得意先** | Customer | `customers` | 顧客と同義 |
| **得意先コード** | Customer Code | `customers.customer_code` | 顧客コード |
| **先方品番** | Customer Part No | `customer_items.customer_part_no` | 得意先品番と同義 |
| **メーカー品番** | Maker Part No | `supplier_items.maker_part_no` | 在庫実体の業務キー |
| **仕入先品目** | Supplier Item | `supplier_items` | メーカー品番の実体テーブル |
| **仕入先品目ID** | Supplier Item ID | `supplier_items.id` | メーカー品番への参照 |

---

## ⚠️ 紛らわしい用語の整理

### 1. `product_group_id` とは何か？

**正体:**
- `product_group_id` = `supplier_items.id` への外部キー
- **実際の意味:** 仕入先品目ID（メーカー品番への参照）

**歴史的な命名:**
- 昔は「製品グループ」という概念があったため、`product_group_id` という名前が残っている
- **現在の2コード体系では:** `supplier_item_id` と呼ぶべきもの

**使用例:**
```sql
-- lot_receipts テーブル
product_group_id BIGINT  -- 仕入先品目ID（supplier_items.id 参照）
                         -- = どのメーカー品番のロットか

-- order_lines テーブル
product_group_id BIGINT  -- 仕入先品目ID（supplier_items.id 参照）
                         -- = どのメーカー品番の受注か
```

**コメント記述例:**
```
❌ 悪い: "製品グループID"
✅ 良い: "仕入先品目ID（メーカー品番への参照）"
✅ 良い: "仕入先品目ID（supplier_items参照）"
```

---

### 2. `supplier_item_id` と `product_group_id` の違い

**結論: 意味は同じだが、移行期の歴史的な理由で2つの名前が存在する**

| カラム名 | 使われる場所 | 意味 |
|---------|-------------|------|
| `product_group_id` | 古いテーブル（lot_receipts, order_lines等） | 仕入先品目ID（歴史的命名） |
| `supplier_item_id` | 新しいテーブル（lot_receipts.supplier_item_id） | 仕入先品目ID（正確な命名） |

**どちらも `supplier_items.id` への参照**

---

### 3. `products` テーブルとは何か？

**重要: `products` テーブルは業務識別子ではない！**

**役割:**
- グルーピング用の補助テーブル
- 複数の `supplier_items` を束ねて「同じ種類の商品」として集計する

**禁止事項:**
- ❌ `products.id` を業務コードとして使用すること
- ❌ 在庫引当に `products.id` を使用すること
- ❌ 注文処理に `products.id` を使用すること

**許可される使用:**
- ✅ 売上レポートでの製品別集計
- ✅ UI上での「関連商品」表示

**コメント記述例:**
```
❌ 悪い: "製品ID"
✅ 良い: "製品グループID（グルーピング用、業務識別子ではない）"
```

---

## 📋 正しいコメント記述例

### 在庫テーブル（lot_receipts）

```sql
-- ❌ 間違い
product_group_id: "製品グループID"
supplier_item_id: "仕入先品目ID（SSOT）"  -- "SSOT" が分かりにくい

-- ✅ 正しい
product_group_id: "仕入先品目ID（メーカー品番への参照、歴史的にproduct_group_idと命名）"
supplier_item_id: "仕入先品目ID（メーカー品番の実体、supplier_items参照）"
warehouse_id: "倉庫ID"
supplier_id: "仕入先ID（仕入元）"
```

### 受注テーブル（order_lines）

```sql
-- ❌ 間違い
customer_part_no: "OCR元の先方品番（変換前の生データ）"  -- 紛らわしい
product_group_id: "製品グループID（OCR取込時はNULL可）"

-- ✅ 正しい
customer_part_no: "得意先品番（先方品番、OCR読取時は生データ）"
product_group_id: "仕入先品目ID（メーカー品番への参照、OCR取込時はNULL可、変換後に設定）"
```

### マスタテーブル（supplier_items）

```sql
-- ❌ 間違い
maker_part_no: "メーカー品番（仕入先の品番、業務キー）"  -- "仕入先の品番" が紛らわしい

-- ✅ 正しい
maker_part_no: "メーカー品番（仕入先が付けた品番、在庫管理の業務キー）"
display_name: "製品名（表示用）"
base_unit: "基本単位（在庫単位）"
```

### 顧客品番マスタ（customer_items）

```sql
-- ❌ 間違い
customer_part_no: "得意先品番（先方品番）"  -- シンプルすぎて説明不足

-- ✅ 正しい
customer_part_no: "得意先品番（先方品番、得意先が注文時に指定する品番）"
supplier_item_id: "仕入先品目ID（メーカー品番への変換先）"
```

---

## 🎯 コメント記述の原則

### 1. 略語・専門用語は避ける
```
❌ "SSOT"  → 何の略か分からない
✅ "在庫実体の単一ソース"
```

### 2. 同義語を併記する
```
✅ "仕入先ID（仕入元）"
✅ "得意先ID（顧客）"
✅ "得意先品番（先方品番）"
```

### 3. 業務的な意味を書く
```
❌ "製品グループID"
✅ "仕入先品目ID（どのメーカー品番のロットかを示す）"

❌ "ステータス"
✅ "ステータス（active=引当可能、depleted=在庫ゼロ、expired=期限切れ）"
```

### 4. FK制約は参照先を明記
```
✅ "仕入先ID（suppliers参照）"
✅ "倉庫ID（warehouses参照）"
✅ "仕入先品目ID（supplier_items参照、メーカー品番の実体）"
```

### 5. 初期値・制約を明記
```
✅ "有効期限（NULL=期限なし）"
✅ "ステータス（デフォルト: active）"
✅ "バージョン（楽観的ロック用、デフォルト: 1）"
```

---

## 🔄 2コード体系の復習

このシステムは **2つのコード体系のみ** で運用します：

### 1. メーカー品番（仕入先側の品番）
- **テーブル:** `supplier_items`
- **業務キー:** `maker_part_no`
- **用途:** 在庫管理の実体
- **例:** `SUZ-BOLT-001` (有限会社鈴木電気の品番)

### 2. 得意先品番（顧客側の品番）
- **テーブル:** `customer_items`
- **業務キー:** `customer_part_no`
- **用途:** 受注入力
- **例:** `TOYOTA-A12345` (トヨタ自動車の品番)

### 変換フロー

```
得意先からの注文（先方品番）
  ↓
customer_items でマッピング検索
  ↓
supplier_items.maker_part_no で在庫引当
  ↓
出荷
```

---

## 📚 関連ドキュメント

- [CODE_SYSTEM_DEFINITION.md](../project/CODE_SYSTEM_DEFINITION.md) - 2コード体系の詳細定義
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体概要

---

**Last Updated:** 2026-01-31
**Author:** Claude (AI Assistant)
