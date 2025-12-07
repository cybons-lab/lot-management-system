# マスタ一括インポート機能 技術仕様書 (Tech Spec)

## 1. データモデル

### 1.1 中間モデル (ImportedRow / Import Schema)
全ての入力ファイル（JSON, YAML, Excel）は、一旦システム内部で定義されたPydanticモデル（中間表現）に変換されてから処理される。
これにより、入力フォーマットの差異を吸収し、統一されたバリデーションロジックを適用する。

- **SupplyDataImport**: 仕入系データルート
    - `suppliers`: List[SupplierImportRow]
- **CustomerDataImport**: 得意先系データルート
    - `customers`: List[CustomerImportRow]

#### 階層構造の例 (YAMLイメージ)
```yaml
suppliers:
  - supplier_code: "V001"
    supplier_name: "Vendor A"
    products:
      - maker_part_code: "P001"  # Products table
        product_name: "Product A"
        is_primary: true         # ProductSuppliers table
        lead_time_days: 10
```

### 1.2 テーブルマッピング
入力データは以下の順序でデータベーステーブルにマッピングされる。

#### Group 1: Supply Side
1.  **suppliers** (仕入先)
    - Key: `supplier_code`
2.  **products** (製品)
    - Key: `maker_part_code`
3.  **product_suppliers** (仕入先製品)
    - Key: `product_id`, `supplier_id`
    - 補足: `products` と `suppliers` の登録後にID解決を行って登録。

#### Group 2: Customer Side
1.  **customers** (得意先)
    - Key: `customer_code`
2.  **delivery_places** (納品先)
    - Key: `delivery_place_code`
    - Parent: `customer_id`
3.  **customer_items** (得意先品目)
    - Key: `customer_id`, `external_product_code`
    - Parent: `customer_id`
    - Ref: `product_id` (by `maker_part_code`), `supplier_id` (by `supplier_code`)

## 2. API仕様

### 2.1 ファイルアップロード
- **Endpoint**: `POST /api/admin/master-import/upload`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
    - `file`: アップロードファイル (.json, .yaml, .yml, .xlsx)
    - `dry_run`: `boolean` (default: false)
- **Response**:
    - 成功時: 処理結果サマリ（成功件数、失敗件数、エラー詳細）
    - エラー時: 400 Bad Request (パースエラー、フォーマットエラー)

### 2.2 JSON直接インポート
- **Endpoint**: `POST /api/admin/master-import/json`
- **Content-Type**: `application/json`
- **Body**: `MasterImportRequest` スキーマ準拠のJSON
- **Response**: ファイルアップロードと同様

## 3. ファイル処理ロジック

### 3.1 JSON / YAML
- Pydanticの `model_validate` を使用してスキーマバリデーションを行う。
- 階層構造をそのまま解釈する。

### 3.2 Excel (.xlsx)
- **シート構成**:
    - `suppliers`: 仕入系データ（フラット形式）。製品情報は行を複製して表現、またはカラムプレフィックスで対応（現状の実装はネスト構造への変換ロジックを含む）。
    - `customers`: 得意先系データ。
- **変換**: `pandas` ではなく `openpyxl` 等を用いて読み込み、辞書型リストを経てPydanticモデルへマッピングする。

### 3.3 CSV (廃止)
- CSVは構造化データの表現（特に1対多の関係）に不向きであり、文字コード等のトラブルも多いため、本機能では**サポート対象外**とする。

## 4. エラーハンドリングとトランザクション
- **トランザクション**:
    - インポート処理全体（または大きなブロック単位）で1つのトランザクションとする。
    - 失敗時はロールバックされる（Atomicな動作）。
- **Dry Run**:
    - トランザクションを開始し、全ての処理を行った後、最後に**明示的にロールバック**する。
    - これにより、DB制約（Unique制約など）のチェックも含めた完全な検証が可能。

## 5. 制約事項・注意点
- **データ量**: 一度のリクエストで処理するデータ量は、メモリ使用量とタイムアウトを考慮し、数千件程度を推奨上限とする（大量データの場合は非同期Job化を検討）。
- **ID解決**: インポートデータ内の参照（例: `supplier_code`）は、DB内の既存データとも照合される。存在しないコードを参照している場合はエラーとなる。
