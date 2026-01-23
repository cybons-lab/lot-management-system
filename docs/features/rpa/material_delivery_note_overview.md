# 素材納品書RPA（PADループ）概要

## 1. 概要
素材納品書RPAは、素材納品書の発行処理をPower Automate Desktop（PAD）で実行しつつ、
FastAPIとDBで進捗・結果・失敗理由を一元管理する仕組みです。PAD単体では「どれが失敗したか」「なぜ失敗したか」が追いづらいため、
1件ずつ払い出すループ方式を採用し、サーバー側で状態管理と監査可能性を確保しています。

- **PAD**: 実際の外部処理（PDF生成、登録など）を実行。
- **FastAPI**: ループの払い出しと結果受け付けを提供。
- **DB**: ロック、結果、失敗理由、進捗を保持。

## 2. 全体フロー（簡易）
- Step1: CSV取込 → Run/Items生成
- Step2: 確認 → Step3開始
- **Step3（PADループ）**: next-item → success/failure を繰り返す
- Step4: 突合・レビュー

```
PAD  ← next-item (1件払い出し)
 ↓
処理実行
 ↓
success / failure
```

## 3. PADループ設計の要点
- **ロック付き払い出し**: `FOR UPDATE SKIP LOCKED` で二重取得を防止。
- **冪等性**:
  - 同一ステータスの再送はOK（success→success / failure→failure）。
  - 相反遷移は409（success→failure / failure→success）。
- **Step3中のみ払い出し**: 誤実行防止のため `step3_running` 時に限定。
- **expired lock 回収**: PAD停止時の詰まりを `LOCK_TIMEOUT` として回収し、再処理可能にする。

## 4. 可視化・運用の考え方
- **loop-summary** で分かること
  - `total / done / percent / last_activity_at` で進捗を把握。
- **activity** で分かること
  - 直近の成功/失敗/タイムアウト履歴と詳細メッセージ。
- **停止検知**
  - `processing > 0` かつ `last_activity_at` が一定時間以上更新されない場合に「停止の可能性」を警告。

## 5. API一覧（抜粋）
- **next-item**: 1件払い出し（ロック付き）
- **success / failure**: 結果登録
- **failed-items**: 失敗一覧
- **loop-summary**: 進捗集計
- **activity**: 直近の実行ログ

詳細は `docs/rpa/material_delivery_note_api.md` を参照してください。

## 6. テスト方針
- **HTTP統合テスト**でAPIのロック/冪等性/集計が正しく動くことを確認。
- **Postgres前提**なのは `FOR UPDATE SKIP LOCKED` の挙動がSQLiteでは再現できないため。
- 冪等性・集計・失敗可視化はテストで固定し、運用時の再発防止につなげる。

## 7. 今後の拡張余地（任意）
- failed-items からの再実行フロー
- Run横断のダッシュボード
- イベントテーブル化による詳細監査ログ
