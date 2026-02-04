# 材料発注フォーキャスト設計書（シンプル版）

> **ステータス**: 実装準備中
> **最終更新**: 2026-02-04

---

## 📌 基本方針（確定）

1. **CSVデータはそのまま保存** → 複雑なマスタ分割はしない
2. **既存マスタのみ活用** → 得意先品番、メーカー（層別）、次区
3. **新規テーブルは最小限** → フォーキャストデータ保存用のみ

---

## 1. 既存マスタの活用

### 1.1 得意先品番マスタ（customer_items）- 既存活用

```sql
-- 既存テーブル: customer_items
-- CSV「材質コード」= 得意先品番（customer_part_no）
-- 変更不要、そのまま使用
```

**用途:**
- CSV B列「材質コード」→ `customer_items.customer_part_no` で検索
- FK: `customer_item_id` で紐づけ

---

### 1.2 メーカーマスタ（makers）- 新規作成

```sql
CREATE TABLE makers (
    id BIGSERIAL PRIMARY KEY,
    maker_code VARCHAR(50) NOT NULL UNIQUE,          -- メーカーコード = 層別コード
    maker_name VARCHAR(200) NOT NULL,                -- メーカー名
    display_name VARCHAR(200),                       -- 表示名
    short_name VARCHAR(50),                          -- 短縮名
    notes TEXT,
    valid_to DATE NOT NULL DEFAULT '9999-12-31',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_makers_valid_to ON makers(valid_to);

COMMENT ON TABLE makers IS 'メーカーマスタ（層別コード統合）';
COMMENT ON COLUMN makers.maker_code IS 'メーカーコード（= 層別コード、同じもの）';
```

**データ移行:**
```sql
-- layer_code_mappings から makers へ統合
INSERT INTO makers (maker_code, maker_name)
SELECT layer_code, maker_name FROM layer_code_mappings
ON CONFLICT (maker_code) DO NOTHING;
```

**後方互換ビュー:**
```sql
CREATE VIEW layer_code_mappings AS
SELECT
    maker_code AS layer_code,
    maker_name,
    created_at,
    updated_at
FROM makers
WHERE valid_to >= CURRENT_DATE;
```

---

### 1.3 次区の扱い - 納入先マスタ（delivery_places）活用

**次区 = 納入先マスタの jiku_code**
- `delivery_places.jiku_code` で次区を管理
- 出荷用マスタ（`shipping_master_curated`）の `jiku_code` を **必須** に変更

```sql
-- 出荷用マスタの jiku_code を必須化
ALTER TABLE shipping_master_curated
ALTER COLUMN jiku_code SET NOT NULL;
```

**フォーキャストテーブルとのリレーション:**
- `jiku_code`（文字列）で `delivery_places.jiku_code` にLEFT JOIN
- マスタにデータがなくても警告のみ（保存は継続）

---

## 2. 新規テーブル設計（シンプル版）

### 2.1 material_order_forecasts（フォーキャストデータ）

**CSVの全データをそのまま保存 + 既存マスタFK**

```sql
CREATE TABLE material_order_forecasts (
    id BIGSERIAL PRIMARY KEY,

    -- 対象月（CSV A列、YYYYMM形式 → YYYY-MM に変換）
    target_month VARCHAR(7) NOT NULL,

    -- 既存マスタFK（引当可能な場合のみ、LEFT JOIN用）
    customer_item_id BIGINT REFERENCES customer_items(id) ON DELETE SET NULL,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    maker_id BIGINT REFERENCES makers(id) ON DELETE SET NULL,
    -- 注: delivery_places は jiku_code 文字列で LEFT JOIN（FK制約なし）

    -- CSV生データ（全列保存）
    material_code VARCHAR(50),              -- B列: 材質コード
    unit VARCHAR(20),                       -- C列: 単位
    warehouse_code VARCHAR(50),             -- D列: 倉庫
    jiku_code VARCHAR(50) NOT NULL,         -- E列: 次区（必須）
    delivery_place VARCHAR(50),             -- F列: 納入先
    support_division VARCHAR(50),           -- G列: 支給先
    procurement_type VARCHAR(50),           -- H列: 支購
    maker_code VARCHAR(50),                 -- I列: メーカー（= 層別コード）
    maker_name VARCHAR(200),                -- J列: メーカー名
    material_name VARCHAR(500),             -- K列: 材質

    -- 数量データ（月次集計）
    delivery_lot NUMERIC(15, 3),           -- L列: 納入ロット
    order_quantity NUMERIC(15, 3),         -- M列: 発注
    month_start_instruction NUMERIC(15, 3), -- N列: 月初指示
    manager_name VARCHAR(100),              -- O列: 担当者名
    monthly_instruction_quantity NUMERIC(15, 3), -- P列: 月間指示数量
    next_month_notice NUMERIC(15, 3),      -- Q列: 次月内示

    -- 日別数量（1-31日、JSON or 個別カラム）
    daily_quantities JSONB,                -- R-AL列: 1日〜31日（31列分）

    -- 期間別数量（1-10, 中旬, 下旬、JSON or 個別カラム）
    period_quantities JSONB,               -- AM-AX列: 1-10, 中旬, 下旬（12列分）

    -- スナップショット情報
    snapshot_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    source_file_name VARCHAR(500),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_mof_target_month ON material_order_forecasts(target_month);
CREATE INDEX idx_mof_material_code ON material_order_forecasts(material_code);
CREATE INDEX idx_mof_maker_code ON material_order_forecasts(maker_code);
CREATE INDEX idx_mof_jiku_code ON material_order_forecasts(jiku_code);
CREATE INDEX idx_mof_customer_item ON material_order_forecasts(customer_item_id);
CREATE INDEX idx_mof_maker ON material_order_forecasts(maker_id);
CREATE INDEX idx_mof_snapshot ON material_order_forecasts(snapshot_at);

-- ユニーク制約（同一月・材質・次区・メーカーで1レコード）
CREATE UNIQUE INDEX ux_mof_unique ON material_order_forecasts(
    target_month,
    material_code,
    jiku_code,
    maker_code
);

COMMENT ON TABLE material_order_forecasts IS '材料発注フォーキャスト（CSV全データ保存）';
COMMENT ON COLUMN material_order_forecasts.jiku_code IS '次区コード（出荷用マスタの jiku_code とJOIN）';
COMMENT ON COLUMN material_order_forecasts.maker_code IS 'メーカーコード（= 層別コード）';
COMMENT ON COLUMN material_order_forecasts.daily_quantities IS '日別数量（1-31日）JSONB形式: {"1": 10, "2": 20, ...}';
COMMENT ON COLUMN material_order_forecasts.period_quantities IS '期間別数量 JSONB形式: {"1": 50, ..., "中旬": 200, "下旬": 300}';
```

---

## 3. CSV列マッピング（確定版）

| CSV列 | 列名 | テーブルカラム | 型 | 備考 |
|------|------|--------------|-----|------|
| A | 対象月 | `target_month` | VARCHAR(7) | YYYYMM → YYYY-MM 変換 |
| B | 材質コード | `material_code` | VARCHAR(50) | = 得意先品番 |
| C | 単位 | `unit` | VARCHAR(20) | |
| D | 倉庫 | `warehouse_code` | VARCHAR(50) | |
| E | 次区 | `jiku_code` | VARCHAR(50) | **必須** |
| F | 納入先 | `delivery_place` | VARCHAR(50) | |
| G | 支給先 | `support_division` | VARCHAR(50) | |
| H | 支購 | `procurement_type` | VARCHAR(50) | |
| I | メーカー | `maker_code` | VARCHAR(50) | = 層別コード |
| J | メーカー名 | `maker_name` | VARCHAR(200) | |
| K | 材質 | `material_name` | VARCHAR(500) | |
| L | 納入ロット | `delivery_lot` | NUMERIC(15,3) | |
| M | 発注 | `order_quantity` | NUMERIC(15,3) | |
| N | 月初指示 | `month_start_instruction` | NUMERIC(15,3) | |
| O | 担当者名 | `manager_name` | VARCHAR(100) | |
| P | 月間指示数量 | `monthly_instruction_quantity` | NUMERIC(15,3) | |
| Q | 次月内示 | `next_month_notice` | NUMERIC(15,3) | |
| R-AL (18-48) | 1日〜31日 | `daily_quantities` | JSONB | 31列 |
| AM-AX (49-60) | 1-10, 中旬, 下旬 | `period_quantities` | JSONB | 12列 |

**TOTAL: 60列 → 1テーブルに全部保存**

---

## 4. CSVインポートフロー（シンプル版）

### 4.1 処理ステップ

```python
# Step 1: CSV読み込み（ヘッダーなし）
df = pd.read_csv(file, header=None, dtype=str, keep_default_na=False)

# Step 2: 対象月を取得（A列の先頭行）
target_month_raw = df.iloc[0, 0]  # 例: "202602"
target_month = f"{target_month_raw[:4]}-{target_month_raw[4:6]}"  # "2026-02"

# Step 3: 数量列を数値化（L-Q列 + R-AX列）
qty_cols = list(range(11, 60))  # L列(11)〜AX列(59)
for col_idx in qty_cols:
    df.iloc[:, col_idx] = pd.to_numeric(df.iloc[:, col_idx], errors='coerce')

# Step 4: 日別・期間別数量をJSON化
for idx, row in df.iterrows():
    # 日別数量（R-AL列 = 17-47）
    daily = {str(day): row.iloc[17 + day - 1] for day in range(1, 32)}
    df.at[idx, 'daily_quantities'] = json.dumps(daily)

    # 期間別数量（AM-AX列 = 48-59）
    period_labels = [str(i) for i in range(1, 11)] + ["中旬", "下旬"]
    period = {label: row.iloc[48 + i] for i, label in enumerate(period_labels)}
    df.at[idx, 'period_quantities'] = json.dumps(period)

# Step 5: 既存マスタ引当
df = enrich_with_masters(df, uow.session)

# Step 6: DB保存
for row in df.itertuples():
    forecast = MaterialOrderForecast(
        target_month=target_month,
        material_code=row[1],  # B列
        unit=row[2],           # C列
        warehouse_code=row[3], # D列
        jiku_code=row[4],      # E列（必須）
        # ... 他フィールド
        customer_item_id=row.customer_item_id,  # 引当結果
        maker_id=row.maker_id,                  # 引当結果
        daily_quantities=row.daily_quantities,
        period_quantities=row.period_quantities,
    )
    uow.session.add(forecast)
```

### 4.2 マスタ引当ロジック

```python
def enrich_with_masters(df: pd.DataFrame, db: Session) -> pd.DataFrame:
    """既存マスタ引当（customer_items, makers, warehouses のみ）"""

    # 1. 得意先品番マスタ引当（customer_items）
    customer_item_map = {ci.customer_part_no: ci.id
                         for ci in db.query(CustomerItem).filter(CustomerItem.valid_to >= date.today())}
    df["customer_item_id"] = df.iloc[:, 1].map(customer_item_map)  # B列（材質コード）

    # 2. メーカーマスタ引当（makers）
    maker_map = {m.maker_code: m.id
                 for m in db.query(Maker).filter(Maker.valid_to >= date.today())}
    df["maker_id"] = df.iloc[:, 8].map(maker_map)  # I列（メーカーコード）

    # 3. 倉庫マスタ引当（warehouses）
    warehouse_map = {w.warehouse_code: w.id
                     for w in db.query(Warehouse).filter(Warehouse.valid_to >= date.today())}
    df["warehouse_id"] = df.iloc[:, 3].map(warehouse_map)  # D列（倉庫）

    return df
```

---

## 5. マイグレーション戦略（シンプル版）

### Phase 1: makers マスタ作成（Day 1）

```bash
alembic revision -m "add_makers_master"
```

**内容:**
1. `makers` テーブル作成
2. `layer_code_mappings` → `makers` データ移行
3. 後方互換ビュー作成

---

### Phase 2: 次区必須化（Day 1）

```bash
alembic revision -m "make_jiku_required"
```

**内容:**
1. `delivery_places.jiku_id` を必須化（NOT NULL制約）
2. `shipping_master_curated.jiku_code` を必須化

---

### Phase 3: フォーキャストテーブル（Day 2）

```bash
alembic revision -m "add_material_order_forecasts"
```

**内容:**
1. `material_order_forecasts` テーブル作成（1テーブルのみ）

---

## 6. マスタページ拡張（最小限）

### 新セクション追加（1つだけ）

```typescript
{
  title: "製造元管理 (Manufacturers)",
  description: "メーカー（層別コード）マスタ",
  links: [
    {
      title: "メーカーマスタ",
      description: "製品の製造元（層別コード統合）",
      href: ROUTES.MASTERS.MAKERS,
      icon: Building2,
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
    },
  ],
}
```

**追加画面: 1画面のみ**
- `/masters/makers` - メーカーマスタCRUD

---

## 7. UI設計（フォーキャスト表示ページ）

### 7.1 ページ構成

```
/forecasts/material-orders
┌─────────────────────────────────────────────────────────┐
│ 材料発注フォーキャスト                                   │
│ [対象月: 2026-02 ▼] [CSVインポート] [Excelエクスポート] │
├─────────────────────────────────────────────────────────┤
│ フィルタ: [材質コード] [メーカー▼] [次区▼]             │
├─────────────────────────────────────────────────────────┤
│ ┌─ 固定列 ────┬─ 月次集計 ──┬─ 日別（横スクロール）─┐│
│ │材質│単位│次区│月間指示│発注│ 1 │ 2 │...│31│1-10│中│下││
│ ├────┼────┼────┼────────┼────┼───┼───┼───┼──┼────┼─┼─┤│
│ │ABC │KG  │D大安│1,000   │500 │10 │20 │...│5 │100 │50│30││
│ └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 8. 実装スケジュール（修正版）

### Day 1: マイグレーション
- makers マスタ作成 + データ移行
- 次区必須化（delivery_places, shipping_master_curated）

### Day 2: モデル実装
- makers モデルクラス（SQLAlchemy）
- material_order_forecasts モデルクラス

### Day 3: CSV インポート実装
- CSVパースロジック（ヘッダーなし、60列）
- マスタ引当（customer_items, makers, warehouses）
- JSON変換（daily_quantities, period_quantities）

### Day 4: API実装
- POST /api/material-order-forecasts/import
- GET /api/material-order-forecasts

### Day 5-6: フロントエンド実装
- メーカーマスタ管理UI
- フォーキャスト表示ページ
- CSVインポートUI

---

## 9. データ移行について

### 質問への回答

> データ移行の部分がどういうことか気になる
> delivery_places に jiku_id を追加してマッピング←既にあるよね？

**回答:**
- `delivery_places.jiku_id` は既に存在（任意）
- やることは **任意 → 必須に変更** するだけ

```sql
-- 既にある jiku_id を必須化
ALTER TABLE delivery_places
ALTER COLUMN jiku_id SET NOT NULL;
```

**前提条件:**
- 全ての `delivery_places` レコードに `jiku_id` が設定済み
- もし NULL のレコードがあれば、事前にデータ補完が必要

---

## 10. 完成イメージ

### 新規作成するもの

1. **makers テーブル** - メーカー（層別コード統合）
2. **material_order_forecasts テーブル** - フォーキャストデータ（CSV全部入り）
3. **makers 管理UI** - 1画面
4. **フォーキャスト表示UI** - 1画面

### 既存の変更

1. `delivery_places.jiku_id` - 任意 → 必須
2. `shipping_master_curated.jiku_code` - 任意 → 必須

---

## 11. 次のステップ

**確認事項:**
- [ ] この設計（シンプル版）で問題ないか確認
- [ ] `delivery_places` の全レコードに `jiku_id` が設定済みか確認
- [ ] CSVサンプルの提供（可能であれば）

**問題なければ実装開始します！**
