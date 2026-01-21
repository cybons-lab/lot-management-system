# 素材納品書発行：Run制御先行整備（設計まとめ）

## 目的
- 100件=90分の長時間処理を前提に、Run単位の**開始/監視/停止/再開/中断/ログ/失敗抽出**を先に成立させる。
- Step1〜Step5のUIを「Runが主語」の状態カード/監視ビューで揃え、運用時の迷子を防ぐ。
- **失敗アイテム出力はCSVではなくExcel（.xlsx）**で提供し、0落ちリスクを回避する。

## 前提
- Step3（グルーピング/分割）UIは既にワイヤーに近い形で実装済み。
- DB変更はAlembicマイグレーションで実施する。

---

## 1. 画面設計（ワイヤー準拠＋視認性改善）

### 1-1. メニュー（Stepハブ）
**方針**
- 「説明カード」ではなく**状態カード**にする。
- 各Stepは「状態 / 件数 / 最終更新」を表示。
- Run履歴（Step5入口）は**常設枠**として視認性を確保。

**改善ポイント**
- カード内の説明文を最小限にし、数値・状態を主に表示。
- Step5（Run詳細）は「実行履歴」ではなく**Run監視/詳細**として明確化。

### 1-2. Step1 進度実績ダウンロード
**目的**
- 取得実行 → Run候補作成/更新

**UI構成**
- 入力：期間（開始/終了）＋実行ボタン
- 最新結果サマリ：成功/失敗、取得件数、Run候補作成/更新数
- 導線：作成されたRun候補 → Step2へ

**改善ポイント**
- 実行キュー表示は維持し、長時間前提の心理負荷を下げる。

### 1-3. Step2 発行対象の選択（バラバラ選択）
**目的**
- 発行対象アイテムの選択（ここだけチェック可能）

**UI構成**
- 選択サマリ（選択数/除外数/エラー数）
- フィルタ/検索
- チェック中心テーブル
- 「Step3へ進む」ボタンは**Step2のみ**に固定

**改善ポイント**
- 詳細はドロワー/別画面へ逃がし、テーブルを軽量化。
- 選択サマリは**画面上部固定**で迷子防止。

### 1-4. Step3 発行リスト作成（グルーピング）
**目的**
- Step2選択結果をグルーピング/分割し、Run群を作成

**改善ポイント**
- 100件=90分前提なので「最大件数」「推定時間」を強調表示。

### 1-5. Step4 突合・SAP登録
**目的**
- 検証 → 実行 → 監視

**UI構成**
1. 突合チェック
2. 実行（Runごと開始）
3. 進捗監視

**改善ポイント**
- NG件があるRunは「Step2へ戻る」導線を明示。
- Runごとの進捗はカード化し、視線移動を減らす。

### 1-6. Step5 Run詳細（長時間処理の本丸）
**目的**
- 進捗/ログ/失敗抽出/停止・再開操作

**UI構成**
- 状態・開始時刻・最終更新のサマリ
- 進捗バー
- 操作ボタン（停止/再開/中断）
- ログ（フィルタ付き）
- 失敗アイテム一覧 + **Excel出力**

**改善ポイント**
- ログは「新しい順」かつ折りたたみで視認性確保。
- 失敗アイテムは件数が多い場合にページング。

---

## 2. Run制御設計（DB/状態遷移）

### 2-1. ステータス設計
既存のStepステータスに加えて、Run制御イベントを拡張で扱う。
- step3_running / step3_done / step4_checking / step4_review / done / cancelled
- 追加イベント（イベントログで保持）: paused / resumed / cancelled

### 2-2. 新規テーブル
#### A) rpa_run_groups
- Step3で作成されたRunグループを管理

想定カラム:
- id (PK)
- rpa_type
- grouping_method
- max_items_per_run
- planned_run_count
- created_by_user_id
- created_at

#### B) rpa_run_events
- Run制御イベント（停止/再開/中断/完了/失敗）を記録

想定カラム:
- id (PK)
- run_id (FK)
- event_type
- message
- created_at
- created_by_user_id

#### C) rpa_run_item_attempts
- 失敗アイテムの再試行履歴

想定カラム:
- id (PK)
- run_item_id (FK)
- attempt_no
- status
- error_code
- error_message
- created_at

### 2-3. 既存テーブル拡張（rpa_runs）
追加候補:
- run_group_id (FK)
- progress_percent
- estimated_minutes
- paused_at
- cancelled_at

理由:
- UI即時表示（進捗/推定時間）
- 停止/中断の状態保持

---

## 3. API設計（Run制御先行）

### 3-1. Run制御系
- POST /runs/{id}/pause
- POST /runs/{id}/resume
- POST /runs/{id}/cancel
- GET  /runs/{id}/events
- GET  /runs/{id}/failed-items
- GET  /runs/{id}/failed-items/export (Excel .xlsx)

### 3-2. Step3 Runグループ
- POST /run-groups
- GET  /run-groups/{id}

### 3-3. Step4 実行・検証
- POST /runs/{id}/validate
- POST /runs/{id}/execute

---

## 4. Excel出力（CSV廃止方針）

### 4-1. 方針
- 失敗アイテムの出力は**Excel (.xlsx)**のみ対応。
- CSVは0落ちリスクがあるため提供しない。

### 4-2. 仕様（例）
- シート名: `failed_items`
- 列: RunID / 納品書番号 / 仕入先 / 理由 / エラーコード / 最終試行日時
- 数値/コード系は**文字列セル**として書き込み（0落ち防止）

---

## 5. Alembicマイグレーション方針

1. 新規テーブル追加
   - rpa_run_groups
   - rpa_run_events
   - rpa_run_item_attempts

2. rpa_runs 拡張
   - run_group_id
   - progress_percent
   - estimated_minutes
   - paused_at
   - cancelled_at

3. 既存Runは run_group_id = NULL で影響なし

---

## 6. 実装順序（推奨）
1. DBマイグレーション + モデル拡張
2. Run制御API（pause/resume/cancel/events/failed-items/export）
3. Step5（Run詳細UI）先行実装
4. Step3 Runグループ作成API
5. Step4 3ブロックUI
6. Step2 選択UI再構成
7. メニュー状態カード反映

---

## 7. 追加検討（運用視点）
- 「停止/再開」はRPA実行側との連携可否を要確認。
- Excel出力はバックエンドで生成し、フロントはダウンロードのみ。
- 進捗%はRPA実行側の実績に依存するため、取得元のAPI整備が必要。
