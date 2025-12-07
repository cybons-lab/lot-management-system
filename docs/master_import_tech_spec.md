# マスタインポート機能 技術仕様

## 1. 対象マスタ

### 1.1 suppliers
- id (BIGINT, PK, auto increment)
- sap_vendor_code (UNIQUE, NOT NULL)
- name など

### 1.2 customers
- id
- sap_customer_code (UNIQUE)
- name など

### 1.3 items
- id
- sap_material_code (UNIQUE)
- name など

### 1.4 関係テーブル例
- customer_items (customer_id, item_id)
- supplier_items (supplier_id, item_id)

---

## 2. 中間モデル ImportedRow

```python
class ImportedRow(BaseModel):
    vendor_code: str | None = None
    vendor_name: str | None = None
    customer_code: str
    customer_name: str | None = None
    item_code: str
    item_name: str | None = None
```

- Excel / JSON / YAML すべてこのモデルへ正規化  
- 将来の入れ子JSONも flatten してここへ変換する  

---

## 3. 入力ファイルの処理

### 3.1 判定
- `.xlsx` → Excelローダー  
- `.json` → JSONローダー  
- `.yml` / `.yaml` → YAMLローダー  
- `.csv` → エラー（サポート外）

### 3.2 Excel読み込み
- openpyxl / pandas  
- 列名を ImportedRow へマッピング  

### 3.3 JSON読み込み
- フラット配列 or 入れ子形式を flatten  
- ImportedRow[] を生成

### 3.4 YAML読み込み
- JSONと同様に扱う

---

## 4. インポート処理フロー（詳細）

### Step 1: distinct 抽出
```python
vendor_codes   = {r.vendor_code for r in rows if r.vendor_code}
customer_codes = {r.customer_code for r in rows}
item_codes     = {r.item_code for r in rows}
```

### Step 2: マスタ upsert（ID が決まる）
DB による ID 自動採番を前提に、  
`INSERT ... ON CONFLICT DO UPDATE` を使用。

### Step 3: コード→ID マッピング
```python
vendor_map = {s.code: s.id for s in session.query(Supplier)...}
```

### Step 4: 関係テーブル登録
- customer_items  
- supplier_items  
などを bulk insert / upsert  

---

## 5. 管理画面仕様

### 5.1 初期化
- POST /admin/master/reset  
- 管理者のみ  
- `DELETE` 入力必須  
- 対象テーブル TRUNCATE or DELETE  
- ログ記録  

### 5.2 インポート
- /validate → Dry Run  
- /commit → 本番反映  
- 結果（件数・エラー）を返却  

---

## 6. JSON エクスポート仕様

### 6.1 目的
- 不足ビューの検出  
- Excelレイアウト検討  
- 構造の業務的な正しさ確認  

### 6.2 流れ
1. JOIN済みのフラットデータを取得  
2. アプリ側で入れ子構造に変換  
3. JSON としてダウンロード可能にする  

---

## 7. 制約・注意点

- CSVは禁止（UIにも出さない）  
- Excel列名変更は慎重に  
- バリデーションと反映は別フェーズで実行  
- 大量件数対応は別途バッチ検討  

