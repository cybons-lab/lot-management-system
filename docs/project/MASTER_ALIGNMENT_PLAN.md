# マスタデータ構造改革計画書 (Master Data Alignment Plan)

本ドキュメントは、現場の実運用（メーカー品番中心）とシステムの乖離を解消するための、最終的なアーキテクチャ再設計計画書である。

## 1. 用語・役割の最終定義 (To-Be Definitions)

現場用語・システム用語・DBモデルの対応を以下のように再定義する。システム上の主役を、従来の「社内グループ（Product）」から「メーカー品番（Supplier Item）」へ移行させる。

| 用語 | DBモデル | 定義・役割 (As-Is -> To-Be) |
|------|----------|-----------------------------|
| **メーカー品番**<br>(Manufacturer Part No) | `supplier_items` | **【新主役・在庫のキー】**<br>現場が「モノ」として認識する最小単位。在庫管理、発注、入荷の基準(SSOT)。<br>荷姿、入数、重量などの物理属性はここに属する。 |
| **先方品番**<br>(Customer Part No) | `customer_items` | **【得意先の呼称・Alias】**<br>得意先が注文してくる際の呼び名。メーカー品番への変換フィルターとしての役割。<br>1つのメーカー品番に対して複数の先方品番が存在しうる。 |
| **商品グループ**<br>(Product Group) | `products` | **【グルーピング用・束】**<br>旧: 商品マスタ。<br>同一のモノとみなせる異なるメーカー品番を束ねるための論理ID。在庫の実体ではない。<br>UI上の主役からは降格し、あくまで「名寄せ用」として機能する。 |
| **単位換算**<br>(Unit Conversion) | `supplier_items`配下 | **【メーカー品番依存の属性】**<br>旧: Product紐付き。<br>「1缶=20kg」「1ケース=12個」などの物理的仕様はメーカー品番ごとに定まるため、`supplier_items` に紐付けるのが正。 |

---

## 2. DBモデル変更案 (Database Schema Proposal)

既存テーブルをベースに、意味づけとキー制約を変更する。

### 2-1. 推奨スキーマ案

#### A. Manufacturer Part Number (Core)
```sql
CREATE TABLE supplier_items (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    maker_part_no VARCHAR(100) NOT NULL, -- 業務キー
    
    -- グルーピング用 (当面 NULL可 / 独立稼働優先)
    -- 方針: 独立稼働（SAP連携なし）を優先するため、NULLを許容する。
    -- 運用: 登録時はNULL可とし、後から「商品構成マスタ」へ紐付けを行う運用を許容する。
    product_id BIGINT REFERENCES products(id), 
    
    -- 物理属性
    base_unit VARCHAR(20) NOT NULL DEFAULT 'EA',
    
    UNIQUE (supplier_id, maker_part_no)
);
```

#### B. Customer Part Number (Mapping)
```sql
CREATE TABLE customer_items (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    customer_part_no VARCHAR(100) NOT NULL, -- 業務キー
    
    -- マッピング実体
    supplier_item_id BIGINT REFERENCES supplier_items(id),
    
    -- 代表品番フラグ (Partial Unique Index用)
    is_primary BOOLEAN DEFAULT FALSE,

    UNIQUE (customer_id, customer_part_no)
);

-- 部分ユニーク: 「あるメーカー品番に対して、デフォルトの先方品番は1つ」
CREATE UNIQUE INDEX idx_ci_primary_supplier_item 
ON customer_items (supplier_item_id) 
WHERE is_primary = TRUE;
```

#### C. Product Group (Grouping)
```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL, -- グループ名称
    -- 旧カラム群は後方互換のために残すが、徐々に参照を減らす
    internal_unit VARCHAR(20), 
    ...
);
```

#### D. Unit Conversion (Hybrid Strategy)
単位換算は「入力単位（得意先kg）」と「基準単位（在庫缶）」のズレを解消するために必須ですが、初期導入の障壁を下げます。

1. **Phase 1 (現状維持)**: 現行の `product_uom_conversions` (Product紐付き) を維持する。
   - 現状のCore計算ロジックは `product_uom_conversions` を参照していないため、Phase 1 は「DB/画面の温存（互換維持）」が主目的である。
2. **原則 B → 必要箇所 A**:
   - **原則 (B)**: 変換係数がなくても業務が回る箇所（単なるメモとしての品番など）は、変換なしで通過させます。
   - **例外 (A)**: 「引当」「出荷検品」など、数量計算が必須の処理でのみ、係数未設定をブロックし、設定画面への導線を提示します。
3. **Phase 2 (拡張)**: `supplier_item_uom_conversions` (supplier_item_id主語) を追加し、`product_uom_conversions` より優先して解決します。
   - `net_weight` は必要なら補助属性として扱います（換算の唯一の根拠にはしない）。

---

## 3. UIメニュー再設計案 (UI Redesign)

`MastersPage.tsx` を以下のカテゴリ・名称・並び順に再構築する。
**「メーカー品番」が一番上に来ることが最重要。**

### カテゴリ A: 品番・品目管理 (Items & Materials)
| メニュー名 (日本語) | 説明文 (1行) | 移行のポイント |
|-------------------|-------------|----------------|
| **メーカー品番マスタ** | 仕入先から購入する製品・原材料（在庫の基準）を管理します。 | **【配置変更】** カテゴリ先頭へ移動。<br>※独立稼働時、商品グループ未設定でも登録可能です。<br>詳細画面に「単位換算」「先方品番紐付け」タブを集約。 |
| **先方品番マスタ** | 得意先の注文書に記載される品番（変換ルール）を管理します。 | **【新設/移動】** 「得意先品番マッピング」を改名してここに配置。<br>一覧から「未マッピング」を警告表示。 |
| **商品構成マスタ** | 複数のメーカー品番を束ねるグループ定義・分類を管理します。 | **【名称変更】** 旧「商品マスタ」。<br>主役感を消し、辞書・マスタメンテ的な位置づけへ。 |

### カテゴリ B: 取引先・拠点 (Partners & Locations)
| メニュー名 | 説明文 | 移行のポイント |
|-----------|--------|----------------|
| **仕入先マスタ** | 仕入先の基本情報および主担当者を管理します。 | 詳細画面のタブに「担当者設定」を追加（独立メニュー廃止）。 |
| **得意先マスタ** | 得意先の基本情報や納入ルールを管理します。 | 変更なし。 |
| **納入先・倉庫** | 納入場所、および自社倉庫の情報を管理します。 | 変更なし。 |

### カテゴリ C: システム・設定 (System & Config)
| メニュー名 | 説明文 | 移行のポイント |
|-----------|--------|----------------|
| **出荷制御マスタ** | OCR変換ルールや出荷時の特殊制御を管理します。 | 旧「OCR・出荷用マスタ」等を整理。 |

### 在庫ページの表示方針
現場が直感的に在庫を特定できるよう、以下の優先順位で表示項目を決定します。

1. **リスト表示単位**: 
   - 原則 `supplier_items` (メーカー品番) 単位でグルーピング表示します。
2. **先方品番 (Customer Part No) の表示ルール**:
   - **(1) 引当/出荷中**: 引当情報から「現在の向け先」が特定できる場合は、その得意先の品番を表示します。
   - **(2) デフォルト**: (1)以外の場合、`supplier_item_id` に紐づく `customer_items` のうち、`is_primary=True` のものを表示します。
   - **(3) フォールバック**: (2)も無ければ空欄とし、「マッピング設定」への導線（リンク）を表示します。

---

## 4. Phase分割の移行計画 (Migration Plan)

### Phase 0: 現状把握・準備 (Preparation)
- **変更対象**: Doc only
- **Status**: **Done** (Analyzed on 2026-01-25)
- **分析結果 (Findings)**:
  1. **OrderServiceの依存**: 
     - `create_order` 内で `product.qty_per_internal_unit` を直接参照して `converted_quantity` を計算している。
     - `product_uom_conversions` テーブルはCoreロジックでは**使用されていない**。
     - -> **対策**: `OrderService` 改修時、明細ごとに「どの `supplier_item` を採用するか」を特定するロジックが必要（現在は Product単位で一律）。
  2. **ProductFormの現状**:
     - Frontendで `internal_unit`, `external_unit` を入力させている。
     - -> **対策**: Phase 1では表示維持、Phase 2以降で「デフォルト値」としての扱いに変更し、実体は `supplier_items` 側へ入力させるUIが必要。
  3. **Product作成フロー**:
     - `ProductCreate` APIスキーマは `maker_item_code` を要求するが、Frontendは空文字を送っているケースがある（自動採番または無視）。
     - -> **対策**: `products` テーブルのスリム化時にこれら不要フィールドを削除する。

### Phase 1: UIの見せ方の修正 (UI Renovation)
- **変更対象**: Frontend (`MastersPage.tsx`, Sidebar, Page Headers)
- **Status**: **Done** (Completed on 2026-01-25)
- **変更内容**:
  - メニュー構成を「品番・品目管理」「取引先・拠点」「システム・設定」に再編。
  - 「商品マスタ」を「商品構成マスタ」に、「仕入先別商品設定」を「メーカー品番マスタ」に、「得意先品番マッピング」を「先方品番マスタ」に名称変更。
  - 「主担当設定」を「取引先・拠点」カテゴリへ移動（暫定配置）。
- **影響範囲**: 見た目のみ。ロジック変更なし。
- **P0テスト観点**:
  - 各メニューをクリックして正しい一覧画面へ遷移するか。

### Phase 2: DB拡張・データ移行 (Model Extension)
- **変更対象**: DB (Migration), Backend (Models)
- **Status**: **Done** (Completed on 2026-01-25)
- **Done定義**:
  - `supplier_items.product_id` は **NULLABLEであることを保証**している（DB/Model/APIにNOT NULL前提が残っていない）。
    - すでにNULLABLEなら「確認のみ」で完了扱いとする。
  - `customer_items` に `is_primary` が追加されている。
  - `v_lot_details` ビューに `supplier_item_id`, `customer_part_no`, `mapping_status` が追加されている。
  - 未マッピングブロック基盤（`mapping_validator.py`）が導入されている（**Phase 2 互換モード: `strict=False`**）。
- **移行リスク**:
  - データ重複。移行スクリプトはIdempotent（冪等）に作る。
- **ロールバック**:
  - カラム追加の取り消し（データは消えるが本番影響なし）。

#### Phase 2 互換モード (strict=False) について
- **切替点**: `backend/app/application/services/allocations/mapping_validator.py` の `validate_lot_mapping()` 関数
- **現在の動作 (Phase 2)**:
  - `strict=False`（デフォルト）: `supplier_item_id` が NULL のロットは検証スキップ（既存データとの互換性維持）
  - `supplier_item_id` が設定されているが `customer_items.is_primary=True` のマッピングがない場合のみエラー
- **Phase 3 での切替手順**:
  1. `mapping_validator.py` の `validate_lot_mapping()` を `strict: bool = True` に変更
  2. または、呼び出し元（`commit.py`, `confirm.py`, `withdrawal_service.py`）で `strict=True` を明示的に渡す
- **strict=True で影響を受ける処理**:
  - 引当確定 (`allocations/commit.py:233`)
  - 引当CONFIRM (`allocations/confirm.py:230`)
  - 受注手動出庫 (`inventory/withdrawal_service.py:269`)

### 運用ルール (Operational Rules)
- **Phase 2-1 系の “検証復旧” のための rename 反映漏れ修正（views/tests/type/mypy）は例外的に許容。ただしロジック変更は禁止。**

### Phase 3: ロジック切り替え (Logic Switch)
- **変更対象**: Backend (Service Logic), Frontend (Validation)
- **Done定義**:
  - 在庫計算が `supplier_items` (または `supplier_item_uom_conversions`) の属性値を使用している。
  - APIレスポンスに `supplier_item` ベースの `converted_quantity` が含まれる。
  - 未マッピング品目の出荷指示でエラー・警告が出る。
- **P0テスト観点**:
  - **受注**: 先方品番で受注 -> メーカー品番へ変換されるか。
  - **引当**: 在庫が正しく引当たるか（メーカー品番単位）。
  - **出荷**: 出荷指示書に正しい先方品番（`is_primary`）が印字されるか。

---

## 5. 【要確認】質問リスト (Outstanding Questions)

以下の点は、実装前に現場の合意を取り付けてください。

1. **引当・出荷時の単位換算 (Validation Level)**
   - 「得意先注文(kg)」vs「在庫(缶)」で換算係数が未設定の場合、どのタイミングでエラーとすべきか？ 
   - (現在の方針: **原則B（進められる範囲は進める）／数量計算が必須の処理のみA（ブロック＋設定導線）**。Aの対象は Phase 0 の棚卸しで確定する)

2. **在庫単位 (Base UOM) の正解**
   - 在庫単位は常に `EA` (個) や `CAN` (缶) なのか、メーカー品番によって `KG` 管理もあり得るか？ 
   - (現在の方針: `supplier_items.base_unit` で定義可能とする)

3. **得意先別換算 (Exception)**
   - 同じメーカー品番でも、得意先によって入数（1箱のkg数）が異なるケースは実在するか？
   - (現在の方針: 実在する場合のみ、Phase 2以降で拡張対応)

以上
