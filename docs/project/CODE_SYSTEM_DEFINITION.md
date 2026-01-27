# コード体系の定義（憲法）

**最終更新:** 2026-01-27
**Status:** 🔒 IMMUTABLE - このドキュメントはシステムの根幹定義であり、変更には全体設計の見直しが必要

---

## 重要原則：社内商品コードは存在しない

**禁止事項:**
- 社内独自の「商品コード」を新設すること
- `products.maker_part_code` を業務識別子として使用すること
- メーカー品番・得意先品番以外の「第三のコード体系」を想定すること

**理由:**
このシステムは **2つのコード体系のみ** で運用する。
これはSAPの既存構造（ZSCT3050/ZSCT3125/ZSCT3130）を踏襲した設計である。

---

## 存在する2つのコード体系

### 1. メーカー品番（仕入先側の品番）

**定義:**
- 仕入先が自社商品に付けている品番
- 同じ商品でも、仕入先が異なれば品番も異なる
- 在庫管理の**実体**はこのコードで行う

**業務キー:**
```
(supplier_id, maker_part_no)
```

**DB実装:**
- テーブル: `supplier_items`
- カラム: `maker_part_no` (VARCHAR, NOT NULL)
- 制約: UNIQUE(supplier_id, maker_part_no)

**例:**
- 有限会社鈴木電気: `SUZ-BOLT-001`
- 村上通信有限会社: `MUR-BOLT-007`
- 岡田銀行有限会社: `OKD-GASKET-004`

→ 同じ「M6ボルト」でも、仕入先ごとに異なる品番を持つ

---

### 2. 得意先品番（顧客側の品番）

**定義:**
- 得意先が注文時に指定する品番
- 同じ商品でも、得意先が異なれば品番も異なる
- 受注・出荷時の**入力**はこのコードで行う

**業務キー:**
```
(customer_id, customer_part_no)
```

**DB実装:**
- テーブル: `customer_items`
- カラム: `customer_part_no` (VARCHAR, NOT NULL)
- 制約: UNIQUE(customer_id, customer_part_no)

**例:**
- トヨタ自動車: `TOYOTA-A12345`
- 日産自動車: `NISSAN-X67890`

→ 同じ「M6ボルト」でも、得意先ごとに異なる品番で注文される

---

## 変換マッピング（コア機能）

得意先からの注文（得意先品番）を、在庫（メーカー品番）に変換するのがシステムの主要機能。

**マッピングテーブル:**
```sql
customer_items (
  id,
  customer_id,           -- 得意先
  customer_part_no,      -- 得意先品番（注文時）
  supplier_item_id,      -- メーカー品番への参照（在庫実体）
  UNIQUE(customer_id, customer_part_no)
)

supplier_items (
  id,
  supplier_id,           -- 仕入先
  maker_part_no,         -- メーカー品番（在庫実体）
  UNIQUE(supplier_id, maker_part_no)
)
```

**変換フロー:**
```
1. 得意先から注文: customer_part_no = "TOYOTA-A12345"
   ↓
2. マッピング検索: customer_items で supplier_item_id を取得
   ↓
3. 在庫引当: supplier_items.maker_part_no = "SUZ-BOLT-001" で在庫を確保
   ↓
4. 出荷
```

---

## productsテーブルの位置づけ

**重要: productsは業務識別子ではない**

`products` テーブルは存在するが、これは **グルーピング用の補助テーブル** である。

**役割:**
- Phase2で使用予定（製品カテゴリ別の集計・分析用）
- 複数の `supplier_items` を束ねて「同じ種類の商品」としてグループ化
- `product_id` は **nullable** であり、必須ではない

**禁止事項:**
- ❌ `products.maker_part_code` を業務コードとして使用すること
- ❌ 在庫引当に `product_id` を使用すること
- ❌ 注文処理に `product_id` を使用すること

**許可される使用方法:**
- ✅ 売上レポートでの製品別集計
- ✅ UI上での「関連商品」表示
- ✅ 発注推奨リスト作成時のグルーピング

**例:**
```sql
-- NG: productsを使った在庫引当（間違い）
SELECT * FROM lots WHERE product_id = 123;

-- OK: supplier_itemsを使った在庫引当（正しい）
SELECT * FROM lots
JOIN supplier_items si ON lots.supplier_item_id = si.id
WHERE si.supplier_id = 5 AND si.maker_part_no = 'SUZ-BOLT-001';
```

---

## SAP対応テーブル

このシステムはSAPの以下のテーブル構造を踏襲している：

| SAP Table | 本システム | 説明 |
|-----------|-----------|------|
| ZSCT3050 | `supplier_items` | メーカー品番マスタ（在庫実体） |
| ZSCT3125 | `customer_items` | 得意先品番担当マスタ（変換） |
| ZSCT3130 | `customer_items.supplier_item_id` | 先方品番/メーカー品番紐付け |

---

## AIへの指示（プロンプトテンプレート）

このシステムで作業する際は、以下をプロンプトに含めること：

```
【重要】コード体系の制約
- このシステムは2つのコード体系のみを使用する：
  1. メーカー品番 (supplier_items.maker_part_no)
  2. 得意先品番 (customer_items.customer_part_no)
- 社内商品コード（internal product code）は存在しない
- productsテーブルは補助的なグルーピング用であり、業務識別子ではない
- 在庫管理・注文処理には必ずsupplier_items/customer_itemsを使用すること
```

---

## よくある誤解と正しい理解

### 誤解1: 「商品には社内コードが必要では？」
❌ **誤解:** 社内で統一的な商品コードを持つべき
✅ **正解:** 在庫実体はメーカー品番、注文入力は得意先品番。変換で紐付ける

### 誤解2: 「products.maker_part_codeは商品コードでは？」
❌ **誤解:** maker_part_codeを業務で使う
✅ **正解:** これは内部IDに近いもの。業務ではsupplier_items/customer_itemsを使う

### 誤解3: 「product_idは必須では？」
❌ **誤解:** すべてのsupplier_itemsにproduct_idが必要
✅ **正解:** product_idはnullable。Phase2でグルーピングする際に使う補助項目

---

## データモデル図

```
┌─────────────────┐
│   customers     │
│  (得意先マスタ)  │
└────────┬────────┘
         │
         │ 1:N
         ↓
┌─────────────────────────┐         ┌──────────────────┐
│   customer_items        │ N:1     │  supplier_items  │
│  (得意先品番マスタ)      │─────→  │ (メーカー品番)    │
│                         │         │  【在庫実体】     │
│ - customer_part_no      │         │ - maker_part_no  │
│ - supplier_item_id (FK) │         │                  │
└─────────────────────────┘         └────────┬─────────┘
                                             │
                                             │ 1:N
                                             ↓
                                    ┌─────────────────┐
                                    │      lots       │
                                    │   (在庫ロット)   │
                                    │                 │
                                    │ - lot_number    │
                                    │ - expiry_date   │
                                    └─────────────────┘

                                    ┌──────────────────┐
                                    │    products      │
                                    │ (グルーピング用)  │
                                    │  【補助テーブル】 │
                                    │                  │
                                    │ - maker_part_code│
                                    │   (内部ID的)     │
                                    └──────────────────┘
                                           ↑
                                           │ N:1 (nullable)
                                           │
                                    supplier_items.product_id
```

---

## Phase実装ロードマップ

### Phase1（完了）: SKU駆動アーキテクチャ
- ✅ supplier_itemsを在庫実体とする
- ✅ customer_itemsでマッピング管理
- ✅ product_idをnullableにする
- ✅ メーカー品番の重複を排除

### Phase2（計画中）: 製品グルーピング機能
- products.product_idを活用した集計
- 製品カテゴリ別レポート
- 関連商品推奨機能

### Phase3（未定）: 高度な在庫最適化
- 複数仕入先での価格比較
- 自動発注推奨
- 在庫最適化アルゴリズム

---

## 変更履歴

- **2026-01-27:** 初版作成（Phase1完了時）
- **理由:** AIが3つ目のコード体系を想定する誤解を防ぐため

---

## 関連ドキュメント

- [PHASE1_ARCHITECTURAL_ISSUE.md](./PHASE1_ARCHITECTURAL_ISSUE.md) - メーカー品番重複問題の分析
- [PHASE1_COMPLETION_SUMMARY.md](./PHASE1_COMPLETION_SUMMARY.md) - Phase1実装完了報告
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体概要

---

**この定義は不変です。変更する場合は、システム全体の再設計が必要になります。**
