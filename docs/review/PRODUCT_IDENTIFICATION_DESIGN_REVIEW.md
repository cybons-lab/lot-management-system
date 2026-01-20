# 商品識別設計レビュードキュメント

**作成日**: 2026-01-19
**目的**: 商品マスタと得意先品番マッピングの設計妥当性レビュー
**状態**: 🚨 **重大な設計疑問あり - 外部レビュー待ち**

---

## エグゼクティブサマリー

### 発見された問題

1. ✅ **Service層のデータ損失** - `customer_items_service.py` が22フィールド中16フィールドしか返さない（修正必要）
2. ⚠️ **商品識別子の設計疑問** - ビジネス要件と実装が乖離している可能性

### ユーザーの疑問

> 「ロット管理は仕入先ベースだから基本的にメーカー品番が主になるのは分かる。
> けどその他の情報はほぼ得意先から『○○って先方品番の商品よろしくね』って言われるから、**先方品番ばかりを使うはず**。
> メーカー品番なんてほぼ目にしない。9割がた先方品番を使ってるはずだったんだ。」

### 実装の現状

- **`maker_part_code`**: 133回出現、40ファイル - **システム全体で主要識別子として使用**
- **`customer_part_no`**: 6回出現、5ファイル - **ほぼ使われていない（表示のみ）**

→ **ビジネス要件（先方品番中心）と実装（メーカー品番中心）が逆転している可能性**

---

## 1. 現在のデータベーススキーマ

### 1.1 products テーブル（商品マスタ）

```sql
CREATE TABLE public.products (
    id                      bigint NOT NULL PRIMARY KEY,
    maker_part_code         varchar(100) NOT NULL UNIQUE,  -- 商品コード（PRD-010oe等）
    product_name            varchar(200) NOT NULL,
    base_unit               varchar(20) NOT NULL,
    consumption_limit_days  integer,
    internal_unit           varchar(20) DEFAULT 'CAN' NOT NULL,
    external_unit           varchar(20) DEFAULT 'KG' NOT NULL,
    qty_per_internal_unit   numeric(10,4) DEFAULT 1.0 NOT NULL,
    customer_part_no        varchar(100),                  -- 先方品番（得意先の品番）
    maker_item_code         varchar(100),                  -- メーカー品番（仕入先の品番）
    qty_scale               integer DEFAULT 1 NOT NULL,
    valid_to                date DEFAULT '9999-12-31' NOT NULL,
    created_at              timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at              timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON COLUMN products.customer_part_no IS '先方品番（得意先の品番）';
COMMENT ON COLUMN products.maker_item_code IS 'メーカー品番（仕入先の品番）';
```

**制約:**
- PRIMARY KEY: `id`
- UNIQUE: `maker_part_code`

**インデックス:**
```sql
CREATE UNIQUE INDEX uq_products_maker_part_code ON products (maker_part_code);
CREATE INDEX idx_products_name ON products (product_name);
CREATE INDEX idx_products_valid_to ON products (valid_to);
```

### 1.2 customer_items テーブル（得意先品番マッピング）

```sql
CREATE TABLE public.customer_items (
    customer_id                bigint NOT NULL,              -- 複合PK
    external_product_code      varchar(100) NOT NULL,        -- 複合PK
    product_id                 bigint NOT NULL,
    supplier_id                bigint,
    base_unit                  varchar(20) NOT NULL,
    pack_unit                  varchar(20),
    pack_quantity              integer,
    special_instructions       text,
    shipping_document_template text,
    sap_notes                  text,
    maker_part_no              varchar(100),                 -- OCR用メーカー品番
    order_category             varchar(50),
    is_procurement_required    boolean DEFAULT true NOT NULL,
    shipping_slip_text         text,                         -- 出荷票テキスト
    ocr_conversion_notes       text,
    sap_supplier_code          varchar(50),
    sap_warehouse_code         varchar(50),
    sap_shipping_warehouse     varchar(50),
    sap_uom                    varchar(20),
    valid_to                   date DEFAULT '9999-12-31' NOT NULL,
    created_at                 timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at                 timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,

    PRIMARY KEY (customer_id, external_product_code),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

COMMENT ON COLUMN customer_items.maker_part_no IS 'メーカー品番';
COMMENT ON COLUMN customer_items.order_category IS '発注区分（指示/かんばん等）';
COMMENT ON COLUMN customer_items.is_procurement_required IS '発注の有無';
COMMENT ON COLUMN customer_items.shipping_slip_text IS '出荷票テキスト';
```

**インデックス:**
```sql
CREATE INDEX idx_customer_items_product ON customer_items (product_id);
CREATE INDEX idx_customer_items_supplier ON customer_items (supplier_id);
CREATE INDEX idx_customer_items_valid_to ON customer_items (valid_to);
CREATE INDEX idx_customer_items_order_category ON customer_items (order_category);
```

### 1.3 関連テーブル

**customer_item_jiku_mappings**:
```sql
CREATE TABLE customer_item_jiku_mappings (
    customer_id            bigint NOT NULL,
    external_product_code  varchar(100) NOT NULL,  -- FK to customer_items
    jiku_code              varchar(50) NOT NULL,
    ...
    FOREIGN KEY (customer_id, external_product_code)
        REFERENCES customer_items(customer_id, external_product_code)
);
```

**customer_item_delivery_settings**:
```sql
CREATE TABLE customer_item_delivery_settings (
    customer_id            bigint NOT NULL,
    external_product_code  varchar(100) NOT NULL,  -- FK to customer_items
    delivery_place_id      bigint NOT NULL,
    shipment_text          text,
    ...
    FOREIGN KEY (customer_id, external_product_code)
        REFERENCES customer_items(customer_id, external_product_code)
);
```

---

## 2. フィールド使用頻度調査

### 2.1 調査方法

```bash
# バックエンドコード（backend/app）内での出現回数
grep -r "maker_part_code" backend/app --include="*.py" | wc -l
grep -r "customer_part_no" backend/app --include="*.py" | wc -l
```

### 2.2 調査結果

| フィールド | 出現回数 | ファイル数 | 使用状況 |
|-----------|---------|----------|---------|
| **`maker_part_code`** | **133回** | **40ファイル** | システム全体で主要識別子 |
| **`customer_part_no`** | **6回** | **5ファイル** | 表示・入力のみ |
| **`maker_item_code`** | 使用中 | 複数 | 検索機能（ILIKE） |
| **`external_product_code`** | 多数 | 多数 | 複合主キー、重要 |

### 2.3 maker_part_code の主な使用箇所

**バックエンド（40ファイル、133回）:**

1. **製品サービス** (`products_service.py`): 18回
   - 製品作成・更新・検索
   - ユニーク制約チェック
   - 製品コード生成ロジック

2. **在庫・ロット管理** (9回):
   - `lot_service.py`: ロット情報取得時の製品識別
   - `inventory_service.py`: 在庫照会
   - `lot_repository.py`: ロット検索

3. **受注管理** (`order_service.py`): 製品識別

4. **データインポート** (20回):
   - `import_service.py`: CSVインポート
   - `order_import_service.py`: 受注インポート
   - `forecast_import_service.py`: 予測インポート

5. **検索機能** (2回):
   - `intake_history_service.py`: 入荷履歴検索
   - `withdrawal_service.py`: 出庫検索

6. **API レスポンス**:
   - `products_router.py`: `product_code` として返却（エイリアス）
   - 各種エンドポイントで `product_code` として表示

7. **ビューモデル** (`views_models.py`):
   - `v_lot_details`: ロット詳細ビュー
   - `v_order_line_details`: 受注明細ビュー

8. **テストコード** (多数):
   - 製品識別子として広範囲に使用

### 2.4 customer_part_no の使用箇所

**バックエンド（5ファイル、6回のみ）:**

1. **モデル定義** (`masters_models.py`): カラム定義のみ
2. **スキーマ定義** (`products_schema.py`):
   - `ProductCreate`: 入力フィールド
   - `ProductOut`: 出力フィールド
3. **サービス** (`products_service.py`): パススルー（ビジネスロジックなし）
4. **ルーター** (`products_router.py`): API マッピング

**フロントエンド:**
- `ProductForm.tsx`: フォーム入力フィールド
- `ProductDetailDialog.tsx`: 詳細表示

**⚠️ 重要**: `customer_part_no` は**検索・JOIN・ビジネスロジックで一切使われていない**

---

## 3. 現在のUI表示

### 3.1 商品マスタ画面

**商品一覧テーブル:**
| 列名 | 表示内容 | DBフィールド |
|------|---------|-------------|
| 商品コード | PRD-010oe | `maker_part_code` |
| 商品名 | PRODUCT-0518P | `product_name` |
| メーカー品番 | PRD-010oe | `maker_part_code`（重複表示） |

**商品詳細ダイアログ:**
```
商品コード: PRD-010oe        (maker_part_code)
商品名: PRODUCT-0518P        (product_name)
社内単位: CAN                (internal_unit)
外部単位: KG                 (external_unit)
内部単位あたりの数量: 1      (qty_per_internal_unit)
メーカー品番: -              (maker_item_code) ← 空欄
作成日時: 2026/1/19 9:20:20
```

**商品編集フォーム:**
```tsx
// frontend/src/features/products/components/ProductForm.tsx

<Label>商品コード (メーカー品番)</Label>
<Input {...register("product_code")} />  {/* → maker_part_code */}

<Label>メーカー品番 *</Label>
<Input {...register("maker_item_code")} placeholder="例: MAKER-001" />

<Label>先方品番 *</Label>
<Input {...register("customer_part_no")} placeholder="例: CUST-001" />
```

### 3.2 得意先品番マッピング画面

**テーブル列:**
| 列名 | DBフィールド |
|------|-------------|
| 得意先 | customer_name |
| 先方品番 | external_product_code |
| 商品 | product_name |
| 仕入先 | supplier_name |
| 基本単位 | base_unit |
| 包装 | pack_unit/pack_quantity |
| 発注 | is_procurement_required |
| 出荷票テキスト | shipping_slip_text |
| 特記事項 | special_instructions |

---

## 4. 問題点の整理

### 4.1 重複・混乱しているフィールド

| 概念 | productsテーブル | customer_itemsテーブル | 混乱ポイント |
|------|-----------------|----------------------|------------|
| **システム内部ID** | `maker_part_code` (PRD-010oe) | - | UIで「商品コード（メーカー品番）」と表示 → **誤解を招く** |
| **先方品番** | `customer_part_no` | `external_product_code` | 2箇所に存在、どちらを使うか不明 |
| **メーカー品番** | `maker_item_code` | `maker_part_no` | 2箇所に存在、用途が不明瞭 |

### 4.2 Service層のデータ損失

**ファイル:** `backend/app/application/services/masters/customer_items_service.py:35-56`

**問題:** `_enrich_item()` メソッドが16フィールドしか返さない（DB: 22フィールド）

**欠落フィールド:**
- `shipping_slip_text` ← **UIテーブル列にあるのにAPIが返さない！**
- `is_procurement_required` ← **UIテーブル列にある**
- `maker_part_no`
- `order_category`
- `ocr_conversion_notes`
- `sap_notes`
- `sap_supplier_code`, `sap_warehouse_code`, `sap_shipping_warehouse`, `sap_uom`
- `shipping_document_template`

**影響:**
- UIテーブルの「出荷票テキスト」列が常に空白
- 詳細ダイアログのOCR-SAP変換タブが空データ
- フォームで入力したデータが表示時に消える

**現在のコード:**
```python
def _enrich_item(self, item: CustomerItem) -> dict:
    """Enrich customer item with related names."""
    self.db.refresh(item, attribute_names=["customer", "product", "supplier"])
    return {
        "customer_id": item.customer_id,
        "customer_code": item.customer.customer_code,
        "customer_name": item.customer.customer_name,
        "external_product_code": item.external_product_code,
        "product_id": item.product_id,
        "product_code": item.product.maker_part_code,
        "product_name": item.product.product_name,
        "supplier_id": item.supplier_id,
        "supplier_code": item.supplier.supplier_code if item.supplier else None,
        "supplier_name": item.supplier.supplier_name if item.supplier else None,
        "base_unit": item.base_unit,
        "pack_unit": item.pack_unit,
        "pack_quantity": item.pack_quantity,
        "special_instructions": item.special_instructions,
        # ↑ ここまでしか返していない！以下11フィールドが欠落
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "valid_to": item.valid_to,
    }
```

---

## 5. ビジネス要件の確認

### 5.1 ユーザーの想定していたビジネスフロー

1. **受注プロセス**:
   - 得意先から「先方品番: CUST-ABC で100個注文」が来る
   - システムは**先方品番をベース**に受注登録
   - 先方品番 → 商品マスタを逆引き
   - 商品マスタ → ロット/在庫を確認

2. **在庫・ロット管理**:
   - 仕入先から「メーカー品番: MAKER-XYZ でロット#123入荷」
   - システムはメーカー品番をベースにロット登録

3. **頻度**:
   - **先方品番の使用**: 9割（受注、出荷、問い合わせ対応）
   - **メーカー品番の使用**: 1割（入荷、仕入先とのやりとり）

### 5.2 現在の実装

1. **製品識別の主体**: `maker_part_code` (システム内部ID)
2. **先方品番**: `customer_part_no` は表示のみ、ビジネスロジックで未使用
3. **ロット管理**: `maker_part_code` で識別

→ **「先方品番中心」のビジネス要件と、「maker_part_code中心」の実装が乖離**

---

## 6. 設計の選択肢

### Option A: 現状維持 + 命名改善

**変更内容:**
- `maker_part_code` → `product_code` にリネーム（UIとDB両方）
- `maker_item_code` → `supplier_part_no` にリネーム
- `customer_part_no` は保持（表示用）
- Service層のデータ損失を修正

**メリット:**
- 最小限の変更（命名のみ）
- 既存ロジックを保持

**デメリット:**
- ビジネス要件との乖離は解決しない
- `product_code` の実態が不明瞭（システムID? メーカー品番? 先方品番?）

### Option B: 先方品番をプライマリ識別子に変更

**変更内容:**
- `maker_part_code` を削除
- `customer_part_no` をプライマリ識別子に昇格
- 全ロジックを `customer_part_no` ベースに書き換え

**メリット:**
- ビジネス要件と一致
- ユーザーの直感と一致

**デメリット:**
- **大規模な変更** (40ファイル、133箇所)
- ロット管理のロジック変更が必要
- 先方品番が得意先ごとに異なる場合の対応

### Option C: 内部IDのみで識別（シンプル化）

**変更内容:**
- `maker_part_code` を削除
- `id` (BIGINT) のみで識別
- `customer_part_no` と `supplier_part_no` を表示用フィールドとして保持
- APIレスポンスは `id` と人間可読フィールドの両方を返す

**メリット:**
- シンプルで明確
- ビジネス要件に依存しない設計

**デメリット:**
- APIレスポンスが `id` ベースになる（可読性低下）
- 既存の `product_code` 依存コードの書き換え必要

### Option D: マルチキー対応（両方保持）

**変更内容:**
- `maker_part_code` を `internal_product_code` にリネーム（システム内部ID）
- `customer_part_no` をユニーク制約付きで昇格
- `supplier_part_no` (旧 maker_item_code) を保持
- 検索・取得APIを3つの識別子すべてで対応

**メリット:**
- 柔軟性が高い
- ビジネス要件に対応しつつ後方互換性を保持

**デメリット:**
- 複雑性が増す
- どの識別子を使うべきか判断が必要

---

## 7. 関連ファイル一覧

### 7.1 バックエンド

**モデル:**
- `backend/app/infrastructure/persistence/models/masters_models.py` (Product, CustomerItem)

**スキーマ:**
- `backend/app/presentation/schemas/masters/products_schema.py`
- `backend/app/presentation/schemas/masters/customer_items_schema.py`

**サービス:**
- `backend/app/application/services/masters/products_service.py` (18回)
- `backend/app/application/services/masters/customer_items_service.py` ← **データ損失バグ**
- `backend/app/application/services/inventory/lot_service.py` (9回)
- `backend/app/application/services/inventory/inventory_service.py`
- `backend/app/application/services/orders/order_service.py`
- `backend/app/application/services/master_import/import_service.py` (12回)

**リポジトリ:**
- `backend/app/infrastructure/persistence/repositories/products_repository.py`
- `backend/app/infrastructure/persistence/repositories/lot_repository.py`

**ルーター:**
- `backend/app/presentation/api/routes/masters/products_router.py`
- `backend/app/presentation/api/routes/masters/customer_items_router.py`

### 7.2 フロントエンド

**コンポーネント:**
- `frontend/src/features/products/components/ProductForm.tsx`
- `frontend/src/features/products/components/ProductDetailDialog.tsx`
- `frontend/src/features/customer-items/components/CustomerItemsTable.tsx`
- `frontend/src/features/customer-items/components/CustomerItemForm.tsx`

**API:**
- `frontend/src/features/products/api.ts`
- `frontend/src/features/customer-items/api.ts`

**型定義:**
- `frontend/src/types/api.d.ts`

### 7.3 データベース

**スキーマ:**
- `backend/sql/schema_latest.sql`
- `backend/alembic/baselines/baseline_schema_20260119.sql`

**マイグレーション:**
- `backend/alembic/versions/cleanup_20260119.py`
- `backend/alembic/archive/17625625c5fb_add_customer_part_no_and_maker_item_.py`

---

## 8. 推奨される次ステップ

### 8.1 緊急対応（すぐ修正可能）

✅ **Service層のデータ損失を修正**
- ファイル: `backend/app/application/services/masters/customer_items_service.py`
- 修正内容: `_enrich_item()` に欠落11フィールドを追加
- 影響範囲: 小（1ファイルのみ）
- リスク: 低

### 8.2 設計レビュー（要検討）

⚠️ **ビジネス要件の再確認**
1. 受注プロセスで実際に使われる識別子は？
   - 先方品番が主？
   - メーカー品番が主？
   - 両方必要？

2. 現在のデータの実態確認
   ```sql
   -- 実際のデータを見る
   SELECT
     maker_part_code,
     customer_part_no,
     maker_item_code,
     product_name
   FROM products
   LIMIT 20;
   ```

3. 受注データでの使われ方確認
   - `order_lines` テーブルは `product_id` で参照
   - インポート時に使われる識別子は？

### 8.3 段階的アプローチ案

**Phase 1: データ損失修正 + 命名改善**
- Service層のバグ修正
- UIラベルの改善（「商品コード（メーカー品番）」→「商品コード」）
- ドキュメント整備

**Phase 2: ビジネス要件との整合性確認**
- 実データ調査
- ユーザーヒアリング
- 設計方針決定（Option A/B/C/D）

**Phase 3: 設計変更実装（必要な場合）**
- マイグレーション作成
- ロジック変更
- テスト実施

---

## 9. 質問事項（レビュアーへ）

### 9.1 ビジネス要件について

1. **受注時の識別子**: 得意先からの注文は何で製品を指定する？
   - [ ] 先方品番（得意先の品番）
   - [ ] メーカー品番（仕入先の品番）
   - [ ] システム内部コード（PRD-####）

2. **使用頻度**: 実際の業務での比率は？
   - 先方品番: ___%
   - メーカー品番: ___%

3. **先方品番の一意性**:
   - [ ] 得意先ごとに異なる品番を使う（例: 得意先Aは「ABC-001」、得意先Bは「XYZ-999」）
   - [ ] すべての得意先で共通の品番を使う

4. **メーカー品番の一意性**:
   - [ ] 仕入先ごとに異なる品番（例: 仕入先Aは「M-001」、仕入先Bは「S-AAA」）
   - [ ] すべての仕入先で共通の品番

### 9.2 技術的判断について

5. **現在の `maker_part_code` の扱い**:
   - [ ] システム内部IDとして保持（命名変更のみ）
   - [ ] 削除して `id` のみで識別
   - [ ] 先方品番に置き換え

6. **マイグレーションの許容範囲**:
   - [ ] 小規模変更のみ（1-5ファイル）
   - [ ] 中規模変更OK（10-20ファイル）
   - [ ] 大規模変更OK（40ファイル以上）

---

## 10. 参考資料

### 10.1 関連ドキュメント

- `/Users/kazuya/dev/projects/lot-management-system/CLAUDE.md` - プロジェクト概要
- `/Users/kazuya/dev/projects/lot-management-system/docs/domain/glossary.md` - 用語集
- `/Users/kazuya/dev/projects/lot-management-system/docs/db/schema.md` - スキーマドキュメント

### 10.2 調査結果ファイル

- `/Users/kazuya/.claude/plans/flickering-honking-matsumoto.md` - 初回調査レポート

---

## 付録A: データサンプル

### A.1 products テーブルのサンプルデータ

```sql
-- テストデータ生成コード (masters.py:127-187)
maker_part_code: PRD-###?? (例: PRD-010oe, PRD-010zU)
product_name: PRODUCT-##### (例: PRODUCT-0518P)
customer_part_no: (ほぼ空白、未使用)
maker_item_code: (ほぼ空白、未使用)
```

### A.2 customer_items テーブルのサンプルデータ

```sql
-- テストデータ生成コード (masters.py:252)
external_product_code: EXT-{customer_code}-{product.maker_part_code}
                       (例: CUST-0001-PRD-010oe)
```

---

## 付録B: コード抜粋

### B.1 製品サービスでの maker_part_code 使用例

```python
# backend/app/application/services/masters/products_service.py:167-185

async def _generate_unique_product_code(self) -> str:
    """Generate a unique product code (PRD-XXXXX)."""
    async with self.db.begin():
        for _ in range(100):
            code = f"PRD-{fake.unique.bothify(text='###??')}"
            existing = await self.db.execute(
                select(Product).where(Product.maker_part_code == code)
            )
            if existing.scalar_one_or_none() is None:
                return code
        raise ValueError("Failed to generate unique product code")
```

### B.2 ロットサービスでの maker_part_code 使用例

```python
# backend/app/application/services/inventory/lot_service.py

# ロット情報取得時に maker_part_code で製品を識別
lot_details = await self.db.execute(
    select(LotMaster, Product.maker_part_code, Product.product_name)
    .join(Product, LotMaster.product_id == Product.id)
    .where(LotMaster.id == lot_id)
)
```

---

**このドキュメントは外部レビュー用に作成されています。設計判断の前に、ビジネス要件の再確認を強く推奨します。**
