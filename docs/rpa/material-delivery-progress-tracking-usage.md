# 素材納品書発行 進捗トラッキング 使い方

**作成日:** 2026-02-01
**関連ドキュメント:** `docs/material-delivery-note-progress-tracking.md`

## 概要

素材納品書発行の実行進捗を可視化する機能です。クラウドフローからPAD実行完了までの各ステップを、UI上でリアルタイムに確認できます。

## 進捗ステップ

以下の5つのステップを順に表示します:

1. **開始** (`CLOUD_FLOW_STARTED`)
2. **RPA端末指示受領** (`PAD_KICK_STARTED`)
3. **RPA実行開始** (`POWERSHELL_PAD_KICKED`)
4. **処理開始** (`PROD_PAD_STARTED`)
5. **処理完了** (`PROD_PAD_DONE`)

## Run IDの発番と受け渡し

### Run ID の発番タイミング

Run ID は **フロントエンドでStep1実行時（またはCSVインポート時）にバックエンドが自動発番** します。

```typescript
// フロントエンド: Step1実行
const response = await createRun(file, "material_delivery_note");
// response.id が Run ID
```

### Power Automate への Run ID 受け渡し

**方法1: URLパラメータで渡す（推奨）**

クラウドフローのURLに Run ID をクエリパラメータとして追加:

```
https://prod-xx.japaneast.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke?runId=123
```

Power Automate側でHTTPトリガーのクエリパラメータから取得:

```
triggerOutputs()?['queries']?['runId']
```

**方法2: リクエストボディで渡す**

POSTリクエストのボディに含める:

```json
{
  "runId": 123,
  "startDate": "2026-01-01",
  "endDate": "2026-01-31"
}
```

Power Automate側:

```
triggerBody()?['runId']
```

## 外部からの進捗イベント投稿

### Power Automate からの投稿

各ステップで以下のHTTPアクションを追加:

#### ステップ1: クラウドフロー開始時

```json
{
  "method": "POST",
  "uri": "https://your-api.com/api/rpa/material-delivery-note/runs/@{variables('runId')}/events",
  "headers": {
    "Authorization": "Bearer @{variables('apiToken')}",
    "Content-Type": "application/json"
  },
  "body": {
    "event_type": "CLOUD_FLOW_STARTED",
    "message": "クラウドフロー実行開始"
  }
}
```

#### ステップ2: PAD端末への指示送信時

```json
{
  "event_type": "PAD_KICK_STARTED",
  "message": "PAD端末に実行指示を送信しました"
}
```

#### ステップ3: PowerShell経由でPADキック時

PowerShellスクリプト内で:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [int]$RunId,

    [Parameter(Mandatory=$true)]
    [string]$ApiToken
)

# ステップ3: RPA実行開始
$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

$body = @{
    event_type = "POWERSHELL_PAD_KICKED"
    message = "PowerShell経由でPAD実行を開始しました"
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "https://your-api.com/api/rpa/material-delivery-note/runs/$RunId/events" `
    -Headers $headers `
    -Body $body

# PAD実行
Start-Process "C:\Program Files\Power Automate Desktop\PAD.Console.Host.exe" -ArgumentList "/run /path:""素材納品書発行"""

# ステップ4: 処理開始（PAD起動確認後）
Start-Sleep -Seconds 5
$body = @{
    event_type = "PROD_PAD_STARTED"
    message = "PAD処理を開始しました"
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "https://your-api.com/api/rpa/material-delivery-note/runs/$RunId/events" `
    -Headers $headers `
    -Body $body

# PAD完了待ち（実装は要件による）
# ...

# ステップ5: 処理完了
$body = @{
    event_type = "PROD_PAD_DONE"
    "message" = "PAD処理が完了しました"
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "https://your-api.com/api/rpa/material-delivery-note/runs/$RunId/events" `
    -Headers $headers `
    -Body $body
```

### PAD Desktop からの投稿（オプション）

PAD内でHTTPアクションを使用:

```
Web.InvokeWebService(
    Url: "https://your-api.com/api/rpa/material-delivery-note/runs/%RunId%/events",
    Method: "POST",
    Headers: {"Authorization": "Bearer %ApiToken%"},
    RequestBody: "{\"event_type\":\"PROD_PAD_STARTED\",\"message\":\"PAD処理開始\"}",
    Response => HttpResponse
)
```

## UI での確認方法

### フル版（Run監視ページ）

1. **RPA管理 → 素材納品書発行（詳細版） → Run監視** にアクセス
2. ページ上部に「実行進捗」カードが表示される
3. 各ステップの状態がアイコンで表示:
   - ✅ **チェックマーク**: 完了
   - 🔄 **スピナー**: 実行中
   - ⚠️ **警告アイコン**: 失敗
   - ⭕ **空の円**: 未実行

### 簡易版（将来実装）

現在は簡易版でRun IDを扱っていないため未対応。将来的に以下の方法で実装予定:

- オプションA: 履歴APIレスポンスに `run_id` を追加 → 履歴すべてで進捗表示
- オプションB: Step1実行レスポンスで `run_id` を返す → 実行直後のみ表示

## API仕様

### イベント投稿エンドポイント

```
POST /api/rpa/material-delivery-note/runs/{runId}/events
```

**リクエストボディ:**

```json
{
  "event_type": "CLOUD_FLOW_STARTED" | "PAD_KICK_STARTED" | "POWERSHELL_PAD_KICKED" | "PROD_PAD_STARTED" | "PROD_PAD_DONE",
  "message": "任意のメッセージ（省略可）"
}
```

**レスポンス:**

```json
{
  "id": 123,
  "run_id": 45,
  "event_type": "CLOUD_FLOW_STARTED",
  "message": "クラウドフロー実行開始",
  "created_at": "2026-02-01T10:00:00Z",
  "created_by_user_id": null
}
```

**認証:**

- `Authorization: Bearer <token>` ヘッダーが必要
- トークンはログインユーザーのアクセストークン、または専用APIキー

### イベント取得エンドポイント

```
GET /api/rpa/material-delivery-note/runs/{runId}/events?limit=100
```

**レスポンス:**

```json
[
  {
    "id": 123,
    "run_id": 45,
    "event_type": "CLOUD_FLOW_STARTED",
    "message": "クラウドフロー実行開始",
    "created_at": "2026-02-01T10:00:00Z"
  },
  {
    "id": 124,
    "run_id": 45,
    "event_type": "PAD_KICK_STARTED",
    "message": "PAD端末に実行指示を送信しました",
    "created_at": "2026-02-01T10:00:15Z"
  }
]
```

## セキュリティ

### APIトークンの管理

**オプション1: ユーザートークンを使用**

フロントエンドで取得したトークンをクラウドフローに渡す:

```typescript
const token = getAuthToken(); // フロントエンドで取得
const url = `${CLOUD_FLOW_URL}?runId=${runId}&token=${token}`;
```

**オプション2: 専用APIキーを発行（推奨）**

バックエンドで外部システム用のAPIキーを発行し、環境変数として管理:

```bash
# Power Automate の環境変数
API_TOKEN=rpa_xxxxxxxxxxxxxxxx
```

### 注意事項

- APIトークンをクエリパラメータで渡す場合、ログに記録される可能性があるため注意
- 本番環境では必ずHTTPS通信を使用
- トークンの有効期限を設定し、定期的にローテーション

## トラブルシューティング

### イベントが投稿されない

1. **Run ID が正しいか確認**
   - フロントエンドのNetwork tabでRun作成時のレスポンスを確認
   - 正しいRun IDをPower Automateに渡しているか確認

2. **認証トークンが有効か確認**
   - トークンの有効期限が切れていないか
   - `Authorization` ヘッダーが正しく設定されているか

3. **APIエンドポイントが正しいか確認**
   - URLのスペルミス、Run IDの埋め込み忘れ

### 進捗が表示されない

1. **Run Eventsが取得できているか確認**
   - ブラウザのNetwork tabで `/runs/{runId}/events` のレスポンスを確認
   - イベントが正しく保存されているか

2. **ステータスが更新されているか確認**
   - Run監視ページは5秒ごとに自動更新
   - 手動リフレッシュ（F5）を試す

3. **event_type のスペルミス**
   - 定義されたステップキーと完全一致する必要がある
   - 大文字小文字を区別

## 実装ファイル

- **フロントエンド:**
  - `frontend/src/features/rpa/material-delivery-note/utils/run-steps.ts` - ステップ定義
  - `frontend/src/features/rpa/material-delivery-note/components/MaterialDeliveryRunProgress.tsx` - 表示コンポーネント
  - `frontend/src/features/rpa/material-delivery-note/pages/RunMonitorPage.tsx` - 組み込み先

- **バックエンド:**
  - `backend/app/presentation/api/routes/rpa/material_delivery_note/event_routes.py` - イベントAPI
  - エンドポイントは既存実装を使用（追加実装なし）

## 今後の拡張予定

- [ ] 簡易版での進捗表示対応（履歴APIにrun_id追加）
- [ ] イベント自動投稿（バックエンドからPower Automateコールバック）
- [ ] 進捗アラート（特定ステップで長時間停止時に通知）
- [ ] 進捗履歴のエクスポート（CSV/Excel）
