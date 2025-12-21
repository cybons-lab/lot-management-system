# 素材納品書発行 API リファレンス

## 概要

Power Automate Desktop (PAD) と連携する素材納品書発行ワークフローのAPIエンドポイント一覧。

**Base URL**: `/api/rpa/material-delivery-note`

---

## 認証

- 大半のエンドポイントはオプショナル認証（ユーザー情報取得用）
- PAD呼び出し用エンドポイントは認証不要

---

## エンドポイント一覧

| メソッド | パス | 用途 | 呼び出し元 |
|---------|------|------|-----------|
| POST | `/runs` | CSV登録（Run作成） | PAD / Web |
| GET | `/runs` | Run一覧取得 | Web |
| GET | `/runs/{run_id}` | Run詳細取得 | Web |
| PATCH | `/runs/{run_id}/items/{item_id}` | Item更新 | Web |
| GET | `/runs/{run_id}/next-item` | 次の処理対象取得 | PAD |
| GET | `/runs/{run_id}/items/{item_id}/lot-suggestions` | ロット候補取得 | Web |
| POST | `/runs/{run_id}/items/batch-update` | 一括更新 | Web |
| POST | `/runs/{run_id}/complete-all` | Step2完了 | Web |
| POST | `/runs/{run_id}/step2` | Step3実行開始 | Web |
| POST | `/runs/{run_id}/external-done` | 外部手順完了 | Web |
| PATCH | `/runs/{run_id}/items/{item_id}/result` | 結果更新 | PAD |
| POST | `/runs/{run_id}/step4-check` | 突合チェック | PAD / Web |
| POST | `/runs/{run_id}/retry-failed` | NG再実行 | Web |
| POST | `/execute` | Flow直接実行 | Web |

---

## 詳細

### POST `/runs` - CSV登録（Run作成）

**用途**: Step1でPADがダウンロードしたCSVを登録

```
Content-Type: multipart/form-data
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `file` | File | ✅ | CSVファイル |
| `import_type` | string | - | `material_delivery_note`（デフォルト） |
| `customer_code` | string | - | **得意先コード（ロット引当用）** |

> [!IMPORTANT]
> `customer_code` はCSV内になく、PADからのリクエスト時に別パラメータとして渡す。
> マスタになくてもエラーにならない（疎結合設計）。

**レスポンス**:
```json
{
  "id": 123,
  "status": "step1_done",
  "item_count": 50,
  "message": "CSV uploaded and items created successfully"
}
```

---

### GET `/runs/{run_id}/next-item` - 次の処理対象取得

**用途**: Step3でPADが1件ずつ処理するための取得

**処理ロジック**:
1. 2分以上経過した `processing` アイテムを `failed_timeout` に変更
2. 未処理アイテム（`result_status` が NULL または `pending`）を取得
3. 層別コードごとの残件数が少ない順にソート
4. 取得したアイテムを `processing` に変更してロック

**レスポンス**: `RpaRunItem` または `null`（全件処理済み）

---

### GET `/runs/{run_id}/items/{item_id}/lot-suggestions` - ロット候補取得

**用途**: Step4でロットNo入力時の候補提示

**検索ロジック**:
```
RpaRun.customer_id + RpaRunItem.external_product_code
    ↓
CustomerItem (product_id, supplier_id)
    ↓
Lot (FEFO順、supplier_idフィルタ)
```

**レスポンス**:
```json
{
  "lots": [
    {
      "lot_id": 1,
      "lot_number": "LOT-001",
      "available_qty": 100.0,
      "expiry_date": "2025-06-30",
      "received_date": "2025-01-15",
      "supplier_name": "仕入先A"
    }
  ],
  "auto_selected": "LOT-001",
  "source": "customer_item"
}
```

| source | 意味 |
|--------|------|
| `customer_item` | CustomerItemから検索成功 |
| `product_only` | ProductからのフォールバックでProduct検索成功 |
| `none` | 該当マスタなし（手動入力） |

---

### PATCH `/runs/{run_id}/items/{item_id}/result` - 結果更新（PAD用）

**用途**: Step3でPADが処理結果を登録

```json
{
  "result_status": "success",
  "sap_registered": true,
  "issue_flag": true
}
```

| result_status | 意味 |
|---------------|------|
| `pending` | 未処理 |
| `processing` | 処理中 |
| `success` | 成功 |
| `failure` | 失敗 |
| `failed_timeout` | タイムアウト |

---

### POST `/runs/{run_id}/step2` - Step3実行開始

**用途**: Step2確認完了後、Step3（PAD実行）を開始

**処理内容**:
1. `issue_flag=true` のアイテムに `lock_flag=true` を設定
2. Cloud Flow URL を呼び出し
3. ステータスを `step3_running` に変更

> [!WARNING]
> ロック後はWeb UIからアイテム編集不可（lot_noのみ例外）

---

## CSV形式

### 必須カラム

| CSVヘッダー | DBカラム | 説明 |
|------------|----------|------|
| ステータス | `status` | 進度状況 |
| 出荷先 | `jiku_code` | 次区コード |
| 層別 | `layer_code` | メーカー識別用 |
| 材質コード | `external_product_code` | 先方品番 |
| 納期 | `delivery_date` | YYYY/MM/DD or YYYY-MM-DD |
| 納入量 | `delivery_quantity` | 桁区切りカンマ対応 |
| 出荷便 | `shipping_vehicle` | 便名 |

---

## フィールド名対応表

| UIラベル | DBカラム | 旧カラム名 | マスタ参照先 |
|----------|----------|-----------|-------------|
| 出荷先 | `jiku_code` | destination | `CustomerItemJikuMapping.jiku_code` |
| 材質コード | `external_product_code` | material_code | `CustomerItem.external_product_code` |

---

## PAD連携シーケンス

```
PAD → POST /runs (customer_code付き)
        ↓
    Run作成、アイテム登録
        ↓
Web → POST /runs/{id}/step2
        ↓
    ロック設定、Cloud Flow起動
        ↓
PAD → GET /runs/{id}/next-item (ループ)
        ↓
    1件ずつ処理
        ↓
PAD → PATCH /runs/{id}/items/{id}/result
        ↓
    結果登録
        ↓
PAD → POST /runs/{id}/step4-check
        ↓
    突合完了 → Step4へ
```
