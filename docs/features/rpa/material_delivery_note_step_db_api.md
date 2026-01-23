# 素材納品書発行: Step別 DB / API 責務まとめ

このドキュメントは、`/rpa/material-delivery-note` 画面で案内される Step1〜Step4 について、
それぞれが利用する API と DB（テーブル/ビュー）の責務を整理したものです。画面側のAPI呼び出しはフロントエンド実装、
DB更新・参照はバックエンド実装を根拠に記載しています。【F:frontend/src/features/rpa/material-delivery-note/pages/MaterialDeliveryNotePage.tsx†L1-L137】

---

## Step1: 進度実績ダウンロード

### 役割
- Power Automate Cloud Flow をキュー実行し、進度実績CSVをダウンロードするためのジョブを作成・監視する。画面は Cloud Flow ジョブの作成・キュー状態取得 API を呼び出す。 【F:frontend/src/features/rpa/material-delivery-note/pages/Step1Page.tsx†L1-L178】【F:frontend/src/features/rpa/material-delivery-note/hooks/useCloudFlow.ts†L1-L76】

### API責務
- **ジョブ作成**: `POST /rpa/cloud-flow/jobs` で Cloud Flow ジョブを作成し、必要に応じて即時実行する。 【F:backend/app/presentation/api/routes/rpa/cloud_flow_router.py†L47-L83】
- **キュー状態取得**: `GET /rpa/cloud-flow/jobs/current` で実行中ジョブと待機キューを返す。 【F:backend/app/presentation/api/routes/rpa/cloud_flow_router.py†L97-L123】
- **CSV取込によるRun作成**: Cloud Flow が取得した CSV を `POST /rpa/material-delivery-note/runs` に渡すと、Run/Item を作成する。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L92-L178】

### DB責務
- **cloud_flow_jobs**: Cloud Flow ジョブのキュー状態（pending/running/completed/failed）と実行パラメータ（start_date/end_date）を保存。 【F:backend/app/infrastructure/persistence/models/cloud_flow_models.py†L47-L104】
- **cloud_flow_configs**: Cloud Flow URL などジョブ実行の設定値を保存。 【F:backend/app/infrastructure/persistence/models/cloud_flow_models.py†L27-L44】
- **rpa_runs / rpa_run_items**: CSV取込で Run と Item を作成し、Step2以降の基礎データとなる。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L148-L325】

---

## Step2: 内容確認

### 役割
- Step1で作成された Run を一覧・詳細表示し、発行対象（issue_flag）や数量などを編集する。 【F:frontend/src/features/rpa/material-delivery-note/pages/Step2CheckListPage.tsx†L1-L131】【F:frontend/src/features/rpa/material-delivery-note/pages/RunDetailPage.tsx†L1-L232】

### API責務
- **Run一覧/詳細取得**: `GET /rpa/material-delivery-note/runs` と `GET /rpa/material-delivery-note/runs/{run_id}` で一覧と明細を取得。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L180-L227】
- **明細更新**: `PATCH /rpa/material-delivery-note/runs/{run_id}/items/{item_id}` で issue_flag / complete_flag / delivery_quantity / lot_no を更新。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L230-L288】
- **一括更新**: `POST /rpa/material-delivery-note/runs/{run_id}/items/batch-update` で複数アイテムのフラグ更新。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L333-L366】
- **Step2完了**: `POST /rpa/material-delivery-note/runs/{run_id}/complete-all` で完了状態を確認。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L369-L396】

### DB責務
- **rpa_runs**: Step2完了判定やステータス遷移に利用。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L148-L258】
- **rpa_run_items**: issue_flag / complete_flag / delivery_quantity など明細の編集内容を保持。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L274-L356】

---

## Step3: PAD実行・監視

### 役割
- Step2完了済みの Run を Power Automate で実行し、PAD が 1件ずつ処理して結果を返却する。
- 実行開始時に対象アイテムをロックし、処理中・完了ステータスを更新する。 【F:backend/app/application/services/rpa/orchestrator.py†L156-L245】

### API責務
- **Step3開始**: `POST /rpa/material-delivery-note/runs/{run_id}/step2` が Cloud Flow を呼び出し、Step3を開始する。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L402-L473】
- **次の処理対象取得**: `GET /rpa/material-delivery-note/runs/{run_id}/next-item` で PAD が次の未処理明細を取得。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L292-L326】
- **処理結果反映**: `PATCH /rpa/material-delivery-note/runs/{run_id}/items/{item_id}/rpa-result` で結果ステータスやSAP登録フラグを更新。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L499-L523】
- **外部手順完了**: `POST /rpa/material-delivery-note/runs/{run_id}/external-done` で外部処理完了をマークしStep4へ進む。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L476-L496】

### DB責務
- **rpa_runs**: Step3実行開始時の status/step2_executed_at 等の更新に使用。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L156-L214】
- **rpa_run_items**: lock_flag の付与、result_status の更新、処理中アイテムの状態管理に使用。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L296-L356】
- **system_configs**: Flow URL 未指定時の設定値取得に利用。 【F:backend/app/application/services/rpa/orchestrator.py†L176-L193】【F:backend/app/infrastructure/persistence/models/system_config_model.py†L14-L41】

---

## Step4: レビュー・SAP登録

### 役割
- Step3完了後に突合（CSV再取得）結果を反映し、突合OKデータのみレビュー・ロット入力・SAP登録を行う。
- NGの再実行や完了処理を行う。 【F:frontend/src/features/rpa/material-delivery-note/pages/Step4ListPage.tsx†L1-L167】【F:frontend/src/features/rpa/material-delivery-note/pages/Step4DetailPage.tsx†L1-L198】

### API責務
- **突合チェック**: `POST /rpa/material-delivery-note/runs/{run_id}/step4-check` でCSV突合結果を更新。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L526-L555】
- **ロット候補取得**: `GET /rpa/material-delivery-note/runs/{run_id}/items/{item_id}/lot-suggestions` でロット候補を返す。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L301-L326】
- **ロット入力更新**: `PATCH /rpa/material-delivery-note/runs/{run_id}/items/{item_id}` で lot_no を更新。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L230-L288】
- **NG再実行**: `POST /rpa/material-delivery-note/runs/{run_id}/retry-failed` でNGのみ再実行。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L558-L573】
- **Step4完了**: `POST /rpa/material-delivery-note/runs/{run_id}/step4-complete` で完了ステータスへ遷移。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L577-L592】

### DB責務
- **rpa_run_items**: match_result / lot_no / sap_registered / order_no 等のレビュー結果を保存。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L296-L356】
- **customer_items / products / v_lot_details**: ロット候補取得時のマスタ・在庫参照に使用。 【F:backend/app/infrastructure/persistence/repositories/rpa_repository.py†L83-L122】【F:backend/app/infrastructure/persistence/models/masters_models.py†L368-L506】【F:backend/app/infrastructure/persistence/models/views_models.py†L142-L220】
- **rpa_runs**: Step4チェック/完了状態の管理に使用。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L156-L214】

---

## 付記: 共通のRun参照 API

- Run一覧・詳細 API は Step2〜Step4 すべての一覧/詳細画面で共通利用される。 【F:backend/app/presentation/api/routes/rpa/material_delivery_note_router.py†L180-L227】

---

## DBモデル / スキーマ参照

実装上のモデル定義（カラム/リレーションの一次情報）は以下を参照してください。

- **RpaRun / RpaRunItem**: 素材納品書発行のRun/Itemモデル定義。 【F:backend/app/infrastructure/persistence/models/rpa_models.py†L148-L356】
- **CloudFlowJob / CloudFlowConfig**: Step1のCloud Flowジョブ/設定モデル定義。 【F:backend/app/infrastructure/persistence/models/cloud_flow_models.py†L27-L104】
- **SystemConfig**: Flow URLの設定値を保持するシステム設定モデル。 【F:backend/app/infrastructure/persistence/models/system_config_model.py†L14-L41】
- **CustomerItem / Product**: ロット候補導出に使う得意先品番/製品マスタ。 【F:backend/app/infrastructure/persistence/models/masters_models.py†L368-L520】
- **VLotDetails (view)**: ロット候補取得時に参照する在庫ビュー。 【F:backend/app/infrastructure/persistence/models/views_models.py†L142-L220】
