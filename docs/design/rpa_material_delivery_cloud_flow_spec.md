# 素材納品書発行：RPAクラウドフロー設計案（Step1/Step3）

## 目的
- Step1/Step3でこちらからクラウドフローをキックする際の**HTTPインターフェース仕様**を明確化する。
- クラウドフロー側からの**進捗/結果通知**の受け口を事前に整理し、実装を簡単にする。

---

## 1. 全体構成（想定）

```
[Frontend] → [Backend API] → [Cloud Flow HTTP Trigger]
                           ← [Cloud Flow → Backend callback]
```

- Step1/Step3は**Backend APIがHTTPでクラウドフローを起動**する。
- 実行中/結果は**クラウドフローからBackendへコールバック**する。
- Backend側はRun/Itemの状態とイベントログを更新し、UIはRun詳細で監視する。

---

## 2. Step1: 進度実績ダウンロードのキック

### 2-1. 送信先（Cloud Flow Trigger）
- **HTTP Request trigger (POST)**

### 2-2. 送信ペイロード（Backend → Cloud Flow）
```json
{
  "run_group_id": null,
  "run_id": null,
  "start_date": "2026-02-10",
  "end_date": "2026-02-17",
  "executed_by": "user.name",
  "requested_at": "2026-02-10T10:00:00+09:00",
  "callback_base_url": "https://api.example.com",
  "callback_token": "<signed token>"
}
```

**補足**
- Step1はRun作成前なので `run_id` は `null`。
- 実行後に取得件数と作成/更新Run数を返す。

### 2-3. Cloud Flow → Backend コールバック
- `POST /rpa/material-delivery-note/step1/result`
```json
{
  "start_date": "2026-02-10",
  "end_date": "2026-02-17",
  "status": "success",
  "item_count": 1243,
  "run_created": 3,
  "run_updated": 1,
  "message": "OK"
}
```

---

## 3. Step3: PAD実行（発行処理）のキック

### 3-1. 送信先（Cloud Flow Trigger）
- **HTTP Request trigger (POST)**

### 3-2. 送信ペイロード（Backend → Cloud Flow）
```json
{
  "run_id": 123,
  "run_group_id": 50,
  "items": [
    {
      "item_id": 1001,
      "row_no": 1,
      "order_no": "00001234",
      "item_no": "00009876",
      "jiku_code": "J-001",
      "layer_code": "A1",
      "external_product_code": "EXT-001",
      "delivery_date": "2026-02-10",
      "delivery_quantity": "100",
      "shipping_vehicle": "1"
    }
  ],
  "executed_by": "user.name",
  "requested_at": "2026-02-10T10:00:00+09:00",
  "callback_base_url": "https://api.example.com",
  "callback_token": "<signed token>"
}
```

**補足**
- `delivery_quantity` は文字列で送る（Excel/CSV由来の0落ち対策）。
- `items` はRun単位で送る（Step3のRun主語と一致）。

### 3-3. Cloud Flow → Backend コールバック

#### (1) 実行開始通知
`POST /rpa/material-delivery-note/runs/{run_id}/events`
```json
{
  "event_type": "started",
  "message": "Run started"
}
```

#### (2) 進捗更新（任意）
`POST /rpa/material-delivery-note/runs/{run_id}/progress`
```json
{
  "progress_percent": 35.5,
  "processing": 12,
  "success": 34,
  "failure": 2,
  "last_activity_at": "2026-02-10T11:34:00+09:00"
}
```

#### (3) アイテム成功/失敗
既存APIを流用
- `POST /rpa/material-delivery-note/runs/{run_id}/items/{item_id}/success`
- `POST /rpa/material-delivery-note/runs/{run_id}/items/{item_id}/failure`

#### (4) 実行完了
`POST /rpa/material-delivery-note/runs/{run_id}/events`
```json
{
  "event_type": "completed",
  "message": "Run completed"
}
```

---

## 4. 認証・認可
- `callback_token` をJWTまたはHMACで付与
- Backend側はトークン検証後に更新処理を許可

---

## 5. 失敗アイテムのExcel出力
- Backend側で `.xlsx` を生成し、UIはダウンロードのみ。
- 数値/コード系は**文字列セル**として書き込み、0落ちを防止。

---

## 6. 実装時の注意
- Cloud Flowは長時間処理なので、**タイムアウト回避のため「分割Run」前提**。
- コールバックは最小限でもOK（開始/完了/失敗通知だけでも運用可能）。
