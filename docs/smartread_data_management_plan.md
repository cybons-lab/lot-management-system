# SmartRead データ保存・管理 詳細計画（最終確定版）

> 本ドキュメントは、SmartRead API を用いた OCR データ取得・保存・再利用・UI表示の  
> **最終確定仕様**を示す。  
>  
> 特に以下を満たすことを最優先とする：
> - APIコスト最小化（1日1タスク／不要な再取得防止）
> - export 全件取得前提でも **重複しない保存**
> - 既存の「横持ちCSV→UIテーブル展開」実装を **破壊しない**
> - request_id 未確定でも前進でき、後から差し替え可能

---

## 0. 方針サマリ（確定事項）

| 項目 | 方針 |
|---|---|
| タスク運用 | **1日1タスク**。同日内は同一タスクに request を追記 |
| export挙動 | exportすると **そのタスク内の全request分がまとめて落ちる** |
| CSV保存 | **CSVファイル単位保存はしない** |
| 生データ | 行単位（wide）保存＋fingerprint重複排除 |
| 変換 | **wide → long は必須生成**（後続処理の本体） |
| 強制再取得（本番） | **append_history のみ** |
| 強制再取得（テスト） | replace / append を許可 |
| request_id | **現時点では未使用（後回し）** |
| 既存実装 | 横持ちCSVのDL & UIテーブル展開は **変更禁止** |

---

## 1. 重要な前提（既存実装の明文化）

### 1.1 既に実装済み・変更禁止事項
- SmartRead export ZIP から **横持ちCSVをダウンロード**
- CSVを **UI上のテーブルとして展開・表示**
- この処理は **既に正常動作している**

👉  
**本計画ではこの処理を「前提として利用」するのみで、  
ロジック・挙動を変更してはならない。**

---

## 2. データモデル設計（最終）

### 2.1 `smartread_tasks`（日次タスク管理）

```text
smartread_tasks
----------------
id                PK
config_id         FK
task_id           string  (unique)
task_date         date    NOT NULL   ← 運用上の正
name              string
state             string
synced_at         datetime  ← タスクリスト同期時刻
skip_today        boolean default false ← ★追加
created_at        datetime
```

#### 役割
- **task_date**：日次タスクの正規日付（JST）
- **synced_at**：「今日はもうタスクリストを取った」判定
- **skip_today**：
  - 「今日はもう読み込まない」フラグ
  - **テスト用途が主**
  - true の場合、export / download をUI・APIともに抑止

---

## 3. データ保存方針（修正版）

### 3.1 `smartread_wide_data`（生データ・行単位）

```text
smartread_wide_data
-------------------
id                PK
config_id         FK
task_id           string
task_date         date
export_id         string
filename          string
row_index         int
content           jsonb
row_fingerprint   string
created_at        datetime
```

#### UNIQUE制約（推奨）
```text
(config_id, task_date, row_fingerprint)
```

- exportが「全件まとめ」でも **重複行は1回だけ保存**
- CSVファイルそのものは保存しない

---

### 3.2 `smartread_long_data`（必須・後続処理用）

```text
smartread_long_data
-------------------
id                PK
wide_data_id      FK (nullable)
config_id         FK
task_id           string
task_date         date
row_index         int
content           jsonb
status            string  (PENDING / IMPORTED / ERROR)
error_reason      string
created_at        datetime
```

- **wide保存後に必ず生成**
- 後続処理・UIは **longを正**とする

---

## 4. 処理フロー（UI連動・確定）

### 4.1 タスクリスト取得（1日1回）

```text
if 今日の smartread_tasks.synced_at が無い:
    GET /v3/task
    smartread_tasks に upsert
    synced_at = now
else:
    DBのみ参照
```

---

### 4.2 新規OCR（追記型）

```text
if task_date = 今日 の task が存在:
    reuse task_id
else:
    POST /v3/task
    ※ タスク名に YYYYMMDD を必ず含める
    smartread_tasks に保存

POST /v3/task/{taskId}/request
```

---

## 5. ダウンロード / export 実行条件（重要）

### 5.1 実行タイミング（UI起点 + 自動監視）

✅ 自動監視（運用時間内）で実行  
✅ **以下の操作時も実行可能**

- タスクを選択
- ユーザーが以下のいずれかを押下：
  - **「ダウンロード」**
  - **「エクスポート」**

#### 自動監視の運用条件
- 監視時間帯: `SMARTREAD_AUTO_SYNC_WINDOW_START` 〜 `SMARTREAD_AUTO_SYNC_WINDOW_END`
- 監視間隔: `SMARTREAD_AUTO_SYNC_INTERVAL_SECONDS`（既定 60 秒）
- 監視ON/OFF: `SMARTREAD_AUTO_SYNC_ENABLED`

---

### 5.2 成功・失敗時のUX

#### 成功時
- トースト通知：
  - 「SmartReadデータの取得に成功しました」
- wide / long テーブルを即時表示

#### 失敗時
- トースト通知：
  - 「SmartReadデータの取得に失敗しました」
- ログに以下を残す：
  - task_id
  - export_id
  - state / error message

---

## 6. 強制再取得・スキップ制御（UI設計）

### 6.1 強制再取得ボタン

#### 配置
- **タスク詳細パネル内**
- 「ダウンロード」「エクスポート」ボタンの近く

#### 挙動
- テスト環境：
  - replace / append を選択可能
- 本番環境：
  - append_history のみ許可

---

### 6.2 「今日はもう読み込まない」フラグ

#### UI
- タスク詳細に **トグル or チェックボックス**
  - 表示文言例：
    - 「今日はもうSmartReadを読み込まない」

#### 挙動
- ON の場合：
  - ダウンロード / エクスポート / 強制再取得ボタンを **無効化**
  - API側でも二重防御

> 主用途：**テスト期間中の事故防止**

---

## 7. request_id 調査（後回しタスク）

### 7.1 現状方針
- request_id が無くても **運用・保存・差分管理は成立**
- 将来取得できた場合のみ拡張対応

---

### 7.2 調査用タスク（ログ追加）

#### ログ対象
1. `POST /task/{id}/request` レスポンスキー
2. 「タスクに含まれるリクエスト一覧」レスポンスキー
3. `GET /task/{id}` 詳細レスポンスキー
4. export ZIP：
   - CSVファイル名一覧
   - 行数
   - 先頭行 fingerprint

#### 実験シナリオ
1. ファイルA → export → 行数
2. ファイルB → export → 行数
3. A+B 両方含まれるか確認

---

## 8. 実装タスク分割（最終）

### PR1（本体）
- DBスキーマ
- export → 行単位保存（fingerprint重複排除）
- wide → long 必須生成
- 既存横持ちUI表示を維持

### PR2（UI/UX）
- タスク選択後のみDL/Export実行
- 強制再取得ボタン
- skip_today フラグ
- 成功/失敗トースト

### PR3（調査）
- request_id 調査用ログ出力

---

## 9. 受け入れ条件（最終）

- [ ] 横持ちCSVのDL & UI表示が壊れていない
- [ ] タスク選択＋操作時のみダウンロードされる
- [ ] 同一タスクでexportを繰り返しても重複保存されない
- [ ] longデータが必ず生成される
- [ ] 強制再取得・skip_today が正しく効く
- [ ] トーストで成功/失敗が明示される

---

## 10. このドキュメントの扱い

- 本Markdownを **正**とする
- 実装・レビュー・AI指示は本ドキュメント参照
- request_id 対応は **差分ドキュメントで追加**
