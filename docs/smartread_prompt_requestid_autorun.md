# 実装プロンプト（SmartRead / requestId正 / 全自動・マニュアル根拠固定版）

あなたは既存システムに SmartRead OCR を組み込みます。あなたはSmartReadのマニュアル本文にアクセスできない前提なので、**以下の「API仕様（根拠付き）」を唯一の正**として扱い、これに従って詳細設計・実装計画・実装指示（ファイル単位）を作成してください。  
※質問で止まらず、仮定は明示しつつ設計案を出し、推奨案を選んで進めてください。

---

## 0. ゴール（必須）

- 監視フォルダまたはUI操作でPDFを投入したら、**完了まで全自動**で進める  
  `request投入 → 完了判定 → results(JSON)取得 → wide/long生成 → DB保存 → UIテーブル表示`
- **正（source of truth）は requestId/results**  
  export/CSVは当面使わない（実装しても「確認用」扱いに留める）
- SmartRead API呼び出し回数を最小化  
  - SmartReadへの状態確認は **バックエンドが指数バックオフで最小限**に実施  
  - フロントからSmartReadへ直接叩かない（APIキー流出防止）
- 既存実装（他機能）と衝突しないよう、詳細設計は既存事情に合わせて調整する

---

## 1. SmartRead API仕様（固定・この章が正）

### 1.1 request投入：非同期開始（即結果は返らない）
- `POST /v3/task/:taskId/request`
  - **202** が返る
  - レスポンスに `requestId` が含まれる（以後の追跡キー）

### 1.2 requestの状態取得（完了判定）
- `GET /v3/request/:requestId`
  - レスポンスはJSON
  - 主なフィールド例：
    - `requestId`, `userId`, `orgId`, `taskId`, `state`, `created`, `modified`, `name`, `requestType`
- `state` の値一覧（列挙が明記されている。漏れなくこの集合として扱う）：
  - `OCR_RUNNING`
  - `OCR_COMPLETED`
  - `OCR_FAILED`
  - `OCR_VERIFICATION_COMPLETED`
  - `SORTING_RUNNING`
  - `SORTING_FAILED`
  - `SORTING_COMPLETED`
  - `SORTING_DROPPED`

### 1.3 results取得（JSON）
- `GET /v3/request/:requestId/results?offset=<int>&limit=<int>`
  - **JSONを返す**
  - **処理中の場合はこのAPIはエラーになる**（先に完了判定が必要）
  - レスポンスは少なくとも次のトップレベルキーを持つ前提で実装する：
    - `results`（必須）
    - `metadata`（存在しうる）
    - `errors`（存在しうる）
- `results` の概形（実レスポンス例に従う・内部構造は変動しうるので“厳密固定しない”）：
  - `results[]` → `pages[]` → `fields[]`
  - `fields[]` には `name`, `fieldId`, `boundingBox`, `correction` などがあり、
    値表現は `singleLine / multiLine / boxedCharacters / checkbox ...` のように型が分かれる

---

## 2. 実装方針（この章も固定：迷わずこれで進める）

### 2.1 UI更新方式：**フロントは自社バックエンドAPIをポーリング（採用）**
- SSEは今回は採用しない（後で追加可能）
- フロントは以下のみを叩く：
  - `POST /our-api/smartread/ingest`（読み取り開始）
  - `GET  /our-api/smartread/requests/:requestId`（状態・結果準備状況の確認）
  - `GET  /our-api/smartread/requests/:requestId/wide`（wide表示用）
  - `GET  /our-api/smartread/requests/:requestId/long`（long表示用）
- ポーリング間隔（推奨）：
  - 1.5〜2.0秒（UI側）、最大 3〜5分でタイムアウト表示
  - ※SmartRead側の状態確認はバックエンドが実施するため、フロントは自社APIしかポーリングしない

### 2.2 ジョブ実行方式：**開発=in-memory、 本番=Redisキュー（採用）**
- 開発：
  - in-memoryキュー or FastAPI BackgroundTasks で十分
  - ただしプロセス再起動でジョブ消失してよい（開発前提）
- 本番：
  - Redis + ワーカー（RQ/Celery/Arq等、既存標準に合わせる）
  - リトライ/並列制御/監視が可能な構成

### 2.3 SmartReadへの状態確認：**指数バックオフ（必須）**
- 例（推奨パラメータ。詳細設計で微調整可だが思想は固定）：
  - 待機：1s → 2s → 4s → 8s → 15s → 30s（以後30s固定）
  - 最大試行：20回（最大待ち ≈ 1〜2分 + 以後30sで上限まで）
  - 上限到達：`TIMEOUT` 扱いでDBに記録し、UIに失敗トースト
- `GET /v3/request/:requestId/results` は処理中エラーになるため、**stateが完了系になってから**呼ぶ

---

## 3. 業務要件（固定）

### 3.1 1日1タスク（JST）で集約
- 同日内のOCR投入は **同一taskIdに集約（追記）**
- 既存実装は「毎回新規task」なので修正対象
- task名に必ず日付を含める（例：`Analyze Task 20260120`）

### 3.2 画面構成（左→右）とテーブル
- 左：監視フォルダ（デフォルト表示）
- 中：タスク
- 右：ファイル読み込み（SmartRead）
- テーブルは2つ必須：
  - wide（確認用）
  - long（後続処理の正 / 必須）

### 3.3 通知・テスト用操作
- 成功/失敗のトースト（必須）
- 「今日はもう読み込まない（skip_today）」トグル（テスト用）
- 「強制再取得」ボタン（テスト用）
  - 挙動は詳細設計で良いが、最低限：既存保存済みでも再処理を走らせられること

---

## 4. DB設計（必須要件：requestIdを核にする）

※既存DB/ORMに合わせて命名は変更可。必須なのは「requestIdを中心に追跡可能なこと」。

### 4.1 smartread_tasks（1日1タスク管理）
- `task_id`（string）
- `task_date`（date, JST）
- `name`
- `synced_at`（optional）
- `skip_today`（bool）

### 4.2 smartread_requests（投入履歴・正の追跡点）
- `request_id`（string, unique）
- `task_id`
- `task_date`（JST）
- `filename`
- `submitted_at`
- `state`（上記 enum ）
- `result_json`（jsonb：results取得後に格納）
- `error_json`（jsonb：失敗時の詳細）

### 4.3 smartread_wide_data / smartread_long_data（表示/後続処理）
- **両方とも `request_id` を外部キーとして必ず持つ**
- wide：
  - `row_index`, `content_json`
- long：
  - `row_index`, `content_json`, `status`（PENDING/IMPORTED/ERROR等）

> resultsの内部構造は変動しうるため、まずは JSONB で保存し、後続処理の要件が固まったら型を強める。

---

## 5. 全自動ワークフロー（必須：この順にする）

1) `get_or_create_daily_task(JST)` で `taskId` を取得（なければ作成）  
2) PDF投入（監視フォルダ or UI） → `POST /v3/task/:taskId/request`  
3) 返った `requestId` を `smartread_requests` に即保存（state=OCR_RUNNING等の初期）  
4) バックエンド・ワーカーが指数バックオフで `GET /v3/request/:requestId` を確認  
5) 完了系になったら `GET /v3/request/:requestId/results` を取得して `result_json` に保存  
6) `result_json` から wide/long を生成して保存  
7) フロントは `GET /our-api/smartread/requests/:requestId` をポーリングし、  
   `READY` になったら wide/long テーブルを表示  
8) 成功/失敗トースト表示

---

## 6. 成果物（あなたが出すべきもの）

1) 既存コード差分方針  
   - どこでtask作成しているか  
   - どう1日1タスクにするか  
2) API呼び出しシーケンス（成功/失敗/タイムアウト）  
3) DBマイグレーション案  
4) `result_json → wide/long` 変換仕様（最低限のマッピング方針）  
5) エラー処理ポリシー  
   - OCR_FAILED / SORTING_FAILED / TIMEOUT / results取得失敗  
6) UI実装方針（3ペイン、2テーブル、トースト、skip_today、強制再取得）  
7) テスト計画  
   - 正常：1ファイル、複数ファイル、同日追記  
   - 異常：失敗、タイムアウト、APIエラー、skip_today、強制再取得

---

## 7. 制約（重要）

- SmartRead APIキーはバックエンドのみ（フロント禁止）
- export/CSV依存は禁止（当面）
- 既存機能を壊さない（特に既存のCSV表示等がある場合は温存）
- 無意味な高頻度SmartReadポーリングは禁止（指数バックオフ必須）

---

## 8. 最初の回答に必ず含めること

- まず全体アーキテクチャ（コンポーネント図/責務分離）
- 主要データモデル（requestId中心）
- ジョブ実行方式（開発in-memory/本番Redis）の実装案
- エンドポイント設計（our-api）
- 受け入れ条件チェックリスト
