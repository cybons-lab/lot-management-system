# 素材納品書発行: 進捗チェック共通化設計

## 目的

- SmartReadで採用した「全工程のチェックリスト表示」を、**素材納品書発行（簡易/フル版）**でも共通化する。
- **クラウドフロー実行 → PADキック → PowerShell経由PADキック → 本番PAD起動 → 終了**の進捗を可視化する。
- 「最初のキック以降は追跡できない」課題を、**外部（PAD/PowerShell）からのイベント投稿**で補完する。

## 背景と前提

- 素材納品書発行（フル版）は `Run` と `RunEvent` を保持し、`getRunEvents` でイベント一覧を取得できる。
- 簡易版はStep1/Step2の履歴表示が中心で、Run/Event を直接扱っていない。
- 外部実行（PAD/PowerShell）は内部から追跡できないため、**外部から状態を通知**する必要がある。

## 共通化の方針

### 1) 進捗ステップを共通定義

SmartReadと同様に、**進捗ステップ配列**を共通定義する。

例（素材納品書発行向け）:

1. `CLOUD_FLOW_STARTED` - クラウドフロー実行
2. `PAD_KICK_STARTED` - PADキック
3. `POWERSHELL_PAD_KICKED` - PowerShell経由PADキック
4. `PROD_PAD_STARTED` - 本番PAD起動
5. `PROD_PAD_DONE` - 本番PAD完了

- UIはこの配列を常に表示し、完了したステップにチェックを付ける。
- 実行中のステップはスピナー、失敗は警告アイコンを表示する。

### 2) Run Event を単一の進捗ソースにする

フル版/簡易版ともに、**Run Event を進捗の真実値 (Single Source of Truth)** として扱う。

- `GET /rpa/material-delivery-note/runs/{runId}/events` で取得
- UIはRun Eventの最新状態からチェックリストを描画する

### 3) 外部からイベントを投稿するエンドポイントを追加

「最初のキック以降は追跡できない」問題を解消するため、
**PAD/PowerShell側からイベント投稿できるAPIを追加**する。

#### 新規エンドポイント（案）

```
POST /rpa/material-delivery-note/runs/{runId}/events
```

**リクエスト例**

```json
{
  "event_type": "PROD_PAD_STARTED",
  "message": "Production PAD started",
  "created_by": "pad-runner"
}
```

**レスポンス例**

```json
{
  "id": 123,
  "run_id": 45,
  "event_type": "PROD_PAD_STARTED",
  "message": "Production PAD started",
  "created_at": "2026-02-01T10:00:00Z"
}
```

### 4) UI側の表示（フル版/簡易版共通）

- Run詳細/履歴画面の上部に「進捗チェックリスト」を表示
- 対象Runが未確定の場合は非表示
- `getRunEvents` をポーリング（例: 5秒ごと）して更新

## 画面適用イメージ

### 簡易版

- Step1 実行カードの下に「進捗チェックリスト」
- Step1 実行後に Run が確定したら表示開始

### フル版

- Run監視ページ/Run詳細ページに共通コンポーネントとして表示
- 既存のRunステータス表示に追加

## 外部からのキック方法（簡易まとめ）

### Power Automate / PAD / PowerShell からのイベント投稿

1. Run ID を取得
   - Step1実行時にレスポンスで `run_id` を返す（またはDBに保存）
2. 進捗の各ポイントでAPIを叩く

#### 例: PowerShell からの送信

```powershell
$runId = 45
$body = @{
  event_type = "PROD_PAD_STARTED"
  message = "Production PAD started"
  created_by = "powershell"
} | ConvertTo-Json

Invoke-RestMethod -Method Post \
  -Uri "https://example.com/api/rpa/material-delivery-note/runs/$runId/events" \
  -Headers @{ Authorization = "Bearer <token>" } \
  -Body $body \
  -ContentType "application/json"
```

#### 例: Power Automate (HTTPアクション)

- Method: `POST`
- URL: `https://example.com/api/rpa/material-delivery-note/runs/{runId}/events`
- Headers: `Authorization: Bearer <token>`
- Body: `{"event_type":"PAD_KICK_STARTED","message":"..."}`

## セキュリティ/権限

- エンドポイントは認証必須（既存APIと同様）
- 必要であれば **専用のAPIキー** を発行して外部フローに利用

## 既存機能との互換性

- 既存のRun/Step機能は維持
- 進捗チェックはRun Eventに追加するのみ
- UIの表示は既存の処理フローを変更しない

## 実装メモ（次工程向け）

- `RunEvent` テーブル/モデルの拡張が必要な場合は `event_type` を追加
- `getRunEvents` のレスポンスを元に進捗ステップを計算するヘルパーを追加
- SmartRead側で導入した `pad-run-steps.ts` と同様の共通定義を作る

