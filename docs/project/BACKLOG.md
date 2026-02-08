# タスクバックログ (統合版)

**最終更新:** 2026-02-07

---

## 概要

本ファイルは、未完了のタスク・調査事項・将来改善項目を集約したバックログです。完了済みのタスクは別途残さず、本バックログに最新の状態のみを記載します。

---

## 1. 優先度: 高 (即時対応)

### 1-A. 全設定ファイルの包括的レビュー（業務システム堅牢性強化）

**優先度:** 高
**作成:** 2026-02-06
**カテゴリ:** コード品質・堅牢性
**状態:** ✅ 完了（後続: asyncpg移行 + 型定義見直しは BACKLOG 3-0/3-4 へ）

**完了済み:**
- [x] `backend/pyproject.toml` - 依存整理、Ruffルール強化（SIM/RET/C4/PERF/TRY/RUF/S/LOG/T20/ERA/ARG/C90/PL追加）、Mypy strict化、pytest統合
- [x] `frontend/tsconfig.json` - `noUncheckedIndexedAccess`, `forceConsistentCasingInFileNames`, `exactOptionalPropertyTypes` 追加
- [x] `frontend/vite.config.ts` - optimizeDeps整理、sourcemap: "hidden" 追加
- [x] `frontend/vitest.config.ts` - clearMocks/restoreMocks/coverage設定追加
- [x] `frontend/package.json` - 依存整理（重複削除、dev移動、knip/coverage-v8追加）
- [x] `.pre-commit-config.yaml` - TypeScriptチェック追加、パス処理改善、make→npm統一
- [x] `backend/pytest.ini` → `pyproject.toml` に統合
- [x] `frontend/knip.json` - デッドコード検出設定追加
- [x] CI/CDワークフローの最適化（Python 3.12統一、--all-extras対応、schema-sync修正）
- [x] `frontend/eslint.config.js` - api.d.tsをESLint対象外に追加（CI/ローカル出力一致）
- [x] ESLint Temporary overrides削減（116 → 44ファイル）
- [x] TSC 0 errors（467件の型エラー解消）
- [x] ESLint 0 errors / 0 warnings（53件解消）
- [x] requests → httpx 統一

**後続タスク:**
- BACKLOG 3-0: asyncpg移行
- BACKLOG 3-4: 型定義見直し・eslint-disable削減

**関連タスク:**
- `docs/archive/backlog/strictness-robustness-plan.md` - 詳細計画（アーカイブ済み）
- `docs/archive/backlog/SUPPRESSION_RESOLUTION_ROUND3.md` - 警告抑制解消（アーカイブ済み）

### 1-0. Phase 4-A: SmartReadデータの楽観的ロック導入

**優先度:** 高（最優先タスク）
**作成:** 2025-02-05
**カテゴリ:** 排他制御・データ整合性
**工数:** 2-3日

**背景:**
Phase 4の調査により、SmartReadのOCR編集機能で**高リスクの競合問題**が判明。複数ユーザーが同時に編集した場合、一方の変更が上書きされる可能性がある。

**問題:**
- `smartread_wide_data` / `smartread_long_data` テーブルにバージョン管理なし
- 全行一括保存により、他ユーザーの変更が消失するリスク
- 現在の保護機構: トランザクションレベルのみ（不十分）

**追加要望 (2026-02-08):**
- **同時実行制御と予約機能:**
  - 同時実行ができないため、後から実行しようとしたユーザーに対し「○○さんが利用中なので次に実行します（予約）」といったフィードバックを出す。
  - RPA系の作業だけでなく、将来的なSAP連携などの重い処理全般に適用可能な仕組みを検討する。

**実装内容:**
1. **マイグレーション:** `version` カラム追加（INTEGER, DEFAULT 1）
2. **モデル更新:** ORM に version フィールド追加
3. **API変更:**
   - 読取時に version を含める
   - 更新時にバージョンチェック
   - 競合時は 409 Conflict を返す
4. **エラーハンドリング:**
   ```python
   if record.version != request.version:
       raise HTTPException(
           status_code=409,
           detail={
               "error": "OPTIMISTIC_LOCK_CONFLICT",
               "current_version": record.version,
               "expected_version": request.version,
               "message": "Data was modified by another user"
           }
       )
   ```
5. **フロントエンド:**
   - version 管理・保持
   - 競合時のエラー表示
   - リロード・リトライ UI

**期待される効果:**
- 複数ユーザーの同時編集時の競合検出
- データ消失の防止
- ユーザーへの明確なフィードバック

**関連ドキュメント:**
- `docs/project/PHASE4_CONCURRENCY_CONTROL_INVESTIGATION.md` - 詳細調査レポート

**元:** Phase 4調査結果（2025-02-05）

---


### 1-1. FastAPI + Vite テスト環境デプロイ実装

**優先度:** 高（次優先タスク）
**作成:** 2026-02-02
**カテゴリ:** インフラ・デプロイ

**背景:**
新規追加されたドキュメント `docs/fastapi_vite_test_deploy_design.md` に基づき、テスト環境でのデプロイ運用を実装する。

**タスク内容:**
1. `C:\app\` ディレクトリ構成の作成
2. `config.json` の作成
3. `start_server.py` / `stop_server.py` の実装（PID管理）
4. `start_server.bat` / `stop_server.bat` / `restart_server.bat` の作成
5. ログ機構の実装 (`server_control.log`)
6. zip デプロイ手順の確立
7. 動作確認・運用マニュアル作成

**期待される効果:**
- テスト環境での再起動作業がダブルクリック1回で完結
- 安全なプロセス管理（PID + ポートチェック）
- シンプルな運用フロー

**関連ドキュメント:**
- `docs/fastapi_vite_test_deploy_design.md`

---

### 1-2. 開発環境の統一と改善 (Critical - DX改善)

**優先度:** 高（次回PR時に対応）

**現状の問題:**
- `typegen`（OpenAPIスキーマからTypeScript型生成）と`ruff`（Pythonリンター）の実行環境が統一されていない
- Docker内で実行すべきか、ローカルで実行すべきか曖昧
- 環境変数（`VITE_BACKEND_ORIGIN` vs `BACKEND_ORIGIN`）の混乱
- 開発中にDockerとローカルを行き来する非効率な作業フロー

**対応方針:**
1. **ツール実行環境の明確化:**
   - `npm run typegen`: **ローカル実行を推奨**（`backend/openapi.json`をホストで共有）
   - `ruff check/format`: **Docker内で実行**（`.git/hooks/pre-commit`で自動化済み）
   - 実行場所を`package.json`/`README.md`に明記

2. **OpenAPIスキーマ生成の自動化:**
   - バックエンド起動時に`openapi.json`を自動生成するスクリプトを追加
   - または、`make typegen`コマンドでワンステップで実行可能に

3. **環境変数の整理:**
   - ✅ 完了: `VITE_BACKEND_ORIGIN` → `BACKEND_ORIGIN`に変更済み
   - Docker Composeの環境変数にコメントを追加して用途を明確化

4. **ドキュメント整備:**
   - `docs/development/SETUP.md`に開発環境セットアップ手順を追加
   - 各ツールの実行環境（Docker/ローカル）を明記

**期待される効果:**
- 開発者が迷わずにツールを実行できる
- CI/CDとローカル開発の一貫性向上
- onboarding時間の短縮

---

### 1-4. E2Eテスト残存問題・不安定性

**現状:** P0テストは **32 passed, 6 skipped** で安定稼働。並列実行 (workers=4) も正常に動作する。

**残存問題（2件 - 低優先度）:**

1. **テストデータ生成が warehouse/product を作成しない**
   - 影響: e2e-02-save-persistence.spec.ts の2テストが一時的にスキップされている。
   - TODO: バックエンドの `test-data/generate` を調査し、warehouse/product データ生成を追加。
   - 現状回避策: 該当テストを `test.skip()` で一時的にスキップ。

2. **ログイン401エラー（散発的 - 未確認）**
   - 症状: テストデータ生成APIのタイムアウトや失敗により、ユーザーが存在せずログインに失敗する。
   - 現状: globalSetup導入後は未発生。継続監視中。

**解決済みタスク:**
- ✅ DBリセットの並列実行競合、socket hang up、reset-database 500エラー → [ARCHIVE.md](./ARCHIVE.md) に移動済み

---

### 1-5. Phase 4-B: セーブポイント・ロック自動クリーンアップ

**優先度:** 高（Phase 4-A完了後）
**作成:** 2025-02-05
**カテゴリ:** 排他制御・運用改善
**工数:** 1.5-2.5日

**背景:**
Phase 4調査により、部分的失敗処理とロック期限切れ管理の改善が必要と判明。

**実装内容:**

#### 3-1. セーブポイント導入（工数: 1-2日）
- **目的:** 複数エンティティ更新時の部分的失敗処理
- **例:** 受注キャンセル時の lot_reservations 一括削除
- **実装:**
  ```python
  with db.begin_nested():  # savepoint 開始
      try:
          # 予約削除処理
      except Exception:
          # savepoint ロールバック
          # 他の処理は継続
  ```

#### 3-2. ロック期限切れ自動クリーンアップ（工数: 0.5日）
- **目的:** orders テーブルの期限切れロックを定期削除
- **実装:** バッチジョブで日次実行
  ```sql
  UPDATE orders
  SET locked_by_user_id = NULL, locked_at = NULL, lock_expires_at = NULL
  WHERE lock_expires_at < NOW() AND locked_by_user_id IS NOT NULL;
  ```

**期待される効果:**
- 部分的失敗時のデータ整合性向上
- 期限切れロックの自動解放
- データベースのクリーンアップ

**関連ドキュメント:**
- `docs/project/PHASE4_CONCURRENCY_CONTROL_INVESTIGATION.md`

**元:** Phase 4調査結果（2025-02-05）

---



### 1-C. 残存するESLint Temporary overridesの解消
**優先度:** 中
**作成:** 2026-02-07
**カテゴリ:** コード品質・リファクタリング
**現状:**
- `eslint.config.js` の `overrides` に登録されているファイル数: **44ファイル** (2026-02-07時点)
- `1-A` で55ファイル以下という当初目標は達成したが、完全なルール準拠のためには残りも順次解消が必要。

**方針:**
- 機能改修やリファクタリングのついでに、関連するファイルの overrides を解除していく。
- 特に `max-lines-per-function`, `complexity` が主な原因であるため、コンポーネント分割やフック抽出を行う。

---

### 1-D. SonarJSルールの段階的厳格化

**優先度:** 中（長期的に解消）
**作成:** 2026-02-08
**カテゴリ:** コード品質・リファクタリング
**現状:**
- `eslint-plugin-sonarjs@3.0.6` を導入し、コード品質問題を検出中
- 既存コードへの影響を最小限にするため、現在は**警告レベル**に設定
- 検出問題: 認知的複雑度違反、ネストされた三項演算子、重複コード、型エイリアス不使用など

**方針:**
1. **新規コード**: 警告が出た時点で即座に修正（品質低下を防止）
2. **既存コード**: 機能改修やリファクタリングのついでに順次解消。一部の指摘事項（`slow-regex`, `no-hardcoded-passwords` 等）はプリコミットフック通過のため、一時的に `warn` レベルに緩和されている（2026-02-08 決定）。
3. **段階的厳格化**: 問題が一定数以下になった時点で、該当ルールを `error` に変更

> [!IMPORTANT]
> **void 演算子の修正に関する注意点 (2026-02-08):**
> `sonarjs/void-use` ルールの修正（`void` 演算子の削除）を行う際は、Promiseを意図的に待機しない（fire-and-forget）ケースであるかを確認し、`.catch(console.error)` を追加するか、意図的な場合は `eslint-disable` で明示すること。動作への影響を慎重に確認する必要がある。

**対象ルール（現在警告レベル）:**
- `sonarjs/cognitive-complexity`: 認知的複雑度（基準: 15以下）
- `sonarjs/no-nested-conditional`: ネストされた三項演算子
- `sonarjs/no-duplicate-string`: 重複文字列（基準: 3回以上）
- `sonarjs/no-identical-functions`: 重複関数
- `sonarjs/no-duplicated-branches`: 重複分岐
- その他（`use-type-alias`, `pseudo-random`, `no-dead-store`など）

**厳格化の目標設定（推奨）:**

```javascript
{
  rules: {
    // セキュリティ強化（すでにエラー ✅）
    "sonarjs/no-hardcoded-credentials": "error",
    "sonarjs/no-hardcoded-passwords": "error",
    
    // コード品質向上（段階的にerrorへ）
    "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
    "sonarjs/no-identical-functions": "error",
    "sonarjs/prefer-immediate-return": "error",
    
    // 認知的複雑度を15から12に厳格化（既存のcomplexityと統一）
    "sonarjs/cognitive-complexity": ["error", 12],
  },
}
```

**進捗トラッキング:**
- 2026-02-08: **主要なエラー修正（Round 1）完了**
  - `sonarjs/no-commented-code`, `sonarjs/void-use` (基本), `sonarjs/concise-regex`, `sonarjs/no-unused-vars` 等を修正。
  - **SonarJS エラー数: 61 → 31 (-30削減)**。
- 残存する主要なエラー:
  - `sonarjs/slow-regex`: OCR/SmartRead の正規表現レビュー。
  - `sonarjs/no-hardcoded-passwords`: テスト/SAP設定のハードコード値。
  - `sonarjs/no-nested-functions`: UIコンポーネントの深いネスト解消。
- 目標: 四半期ごとに50件削減
- 最終目標: すべてのルールを `error` レベルに変更

**関連:**
- 評価レポート: `eslint_sonarjs_review.md`
- ESLint設定: `frontend/eslint.config.js`



## 2. 優先度: 中 (UI/UX・不整合修正)

### 2-0. マスタ表示名の短縮名運用統一（得意先・仕入先・倉庫・納入先）

**優先度:** 中
**作成:** 2026-02-06
**カテゴリ:** UI/UX・マスタ運用整備
**工数:** 2-4日

**背景:**
- 得意先名・仕入先名・倉庫名・納入先名の実名称が長く、画面表示で可読性が低い。
- `display_name` と `short_name` の使い分けが画面/APIで統一されていない。
- 出荷用マスタ運用では「メーカー名 = 仕入先名」の業務ルールがある。

**要件:**
1. 画面表示は短縮名優先（`short_name` → `display_name` → 正式名称の順でフォールバック）
2. 対象マスタ:
   - 得意先（customers）
   - 仕入先（suppliers）
   - 倉庫（warehouses）
   - 納入先（delivery_places）
3. メーカー連携:
   - メーカー名を仕入先名として扱う運用を明確化し、同期時の表示名ルールを定義
4. 手入力運用:
   - 得意先/倉庫/納入先の短縮名は運用側で任意入力できること

**実装候補:**
- 共通表示ヘルパーの導入（表示名選択ロジックを集約）
- 一覧API/CSV出力での表示名列の統一
- 出荷用マスタ同期時の `display_name` / `short_name` 更新ポリシー整理

**受け入れ条件:**
- 主要一覧画面で長い正式名称が減り、短縮名優先表示になる
- 既存データ（短縮名未設定）でも表示崩れせず、フォールバックで表示できる
- 同期・インポート後も表示名運用が一貫する

### 2-1. Phase 4-C: OCR結果編集機能の競合対策

**優先度:** 中（Phase 4-A完了後、詳細確認が必要）
**作成:** 2025-02-05
**カテゴリ:** 排他制御・データ整合性
**工数:** 1-2日（詳細確認後）

**背景:**
Phase 4調査により、OCR結果編集機能の競合リスクが指摘されたが、詳細な編集フローが不明。

**確認事項:**
1. OCR結果編集UIの実装状況
2. ocr_results テーブルの更新処理
3. 受注変換処理との並行実行リスク

**実装内容（確認後）:**
- SmartReadと同様の楽観的ロック導入
- version カラム追加
- 競合時の 409 Conflict 処理

**関連ドキュメント:**
- `docs/project/PHASE4_CONCURRENCY_CONTROL_INVESTIGATION.md`

**元:** Phase 4調査結果（2025-02-05）

---

### 2-3. SmartRead設定フォーム送信のE2Eテスト追加

**優先度**: 中
**作成**: 2026-01-31
**カテゴリ**: テスト品質向上

**背景:**
- SmartRead設定モーダルのフォーム送信（作成・更新）は、shadcn/uiのSelectコンポーネントの複雑なモック要件により、Vitestでのユニットテストが困難
- 現在はフォーム表示のみテストされており、実際の送信フローは未検証

**タスク内容:**
1. Playwrightを使用したE2Eテストの追加
   - SmartRead設定の新規作成フロー
   - 既存設定の更新フロー
   - フォームバリデーションの確認
2. テストファイル配置: `frontend/e2e/rpa-smartread-settings.spec.ts`

**参考:**
- 削除されたユニットテスト: `frontend/src/features/rpa/smartread/components/SmartReadSettingsModal.test.tsx` (L120-168)
- 既存E2Eテスト: `frontend/e2e/auth.spec.ts`, `frontend/e2e/allocation.spec.ts`

---

### 2-2. P2テーブルのテストデータ生成器実装

**優先度:** 中
**作成:** 2026-02-05
**カテゴリ:** テスト・データ品質
**工数:** 1日

**背景:**
P0（5テーブル）とP1（9テーブル）のテストデータ生成器が完成。
残りのP2（システム/メタデータテーブル）の生成器を実装し、全テーブルの包括的なテストデータ基盤を完成させる。

**対象テーブル (9種類):**
1. `sap_material_cache` - SAP材料マスタキャッシュ
2. `order_register_rows` - 受注登録行データ
3. `shipping_master_raw` - 出荷マスタ生データ
4. `shipping_master_curated` - 出荷マスタ整形済
5. `smartread_tasks` - SmartReadタスク管理
6. `smartread_requests` - SmartReadリクエスト
7. `smartread_export_history` - エクスポート履歴
8. `smartread_wide_data` - ワイド形式データ
9. `smartread_long_data` - ロング形式データ

**実装内容:**
- 各テーブルの特性に合わせた正常/異常/エッジケースデータ生成
- FK参照の整合性確保
- SAP連携シミュレーション用データパターン
- SmartRead OCRフロー全体のテストシナリオ対応
- 出荷マスタ同期機能のテストデータ

**期待される効果:**
- 全システム機能の包括的なテストデータ完備
- E2Eテストの実行可能性向上
- 本番環境に近いデータパターンでのテスト

**関連:**
- PR #547: P0/P1テーブル生成器実装

---

<<<<<<< HEAD
### 2-4. Toast通知の不足

- 保存成功時にフィードバックが出ない。
- 対象:
  - `frontend/src/features/warehouses/hooks/useWarehouseMutations.ts`
  - `frontend/src/features/product-mappings/hooks/useProductMappings.ts`
  - `frontend/src/features/delivery-places/hooks/useDeliveryPlaces.ts`

**元:** `backlog.md::2-5` (2026-01-18)

---

### 2-6. ProductDetailPage のコード変更後リダイレクト

- 商品コード変更時にURLが更新されず表示が残る。
- 対象: `frontend/src/features/products/pages/ProductDetailPage.tsx`

**元:** `backlog.md::2-6` (2026-01-18)

---

### 2-7. アーカイブ済みロットの表示バグ

**症状**: 在庫ロット一覧で「アーカイブ済みを表示」にチェックを入れても、アーカイブ済みロットが表示されない（または期待通りに機能しない）。
**タスク**: フィルタリングロジック（バックエンド/フロントエンド）の調査と修正。

**関連:** `next_reviews_ja.md::2`

---

### 2-8. システム設定でのログレベル変更が実行中のバックエンドに反映されない

**優先度**: 中（長期対応）
**作成**: 2026-02-01
**カテゴリ**: 可観測性・運用

**症状:**
- システム設定画面でログレベルを変更しても、実行中のバックエンドプロセスには反映されない。
- バックエンドの再起動が必要。

**現状:**
- ログレベルはアプリケーション起動時に環境変数から読み込まれる。
- 動的変更のメカニズムが存在しない。

**推奨対応（長期）:**
1. ログレベル設定をDBまたは設定ファイルに永続化
2. 設定変更を検知してロガーを再設定する仕組みを実装
3. または、管理画面に「設定変更にはバックエンド再起動が必要」と明示

---

### 2-9. ログマスキングの統一（設定ファイル対応）

**優先度**: 中
**作成**: 2026-02-04
**カテゴリ**: 可観測性・セキュリティ

**背景:**
認証や監査ログで `username` や `user_agent` などPIIが記録されるが、環境や実装によってマスキング有無が揺れる。全ログで一貫したマスキングルールを適用できるようにする。

**タスク内容:**
1. `LOG_SENSITIVE_FIELDS` に `username`, `user_agent`, `client_ip` などを追加して一元管理する（`ip` など汎用キーは誤マスクの恐れがあるため避ける）。
2. ログ出力のキー名を統一し、PIIは必ず `extra` の構造化フィールドで出力する。
3. 本番環境でのマスキング動作を確認し、必要ならドキュメントへ記載する。

**備考:**
`backend/app/core/logging.py` のマスキング処理はキー名ベースのため、キー名の統一が前提。

**関連:**
- バックログ 1-1 の残存課題から抽出
- ブランチ: `fix/e2e-test-remaining-issues`

---



### 2-8. 在庫詳細の仕入先固定

**要望**: 在庫詳細画面において、仕入先が固定（または明確化）されるべき。
**タスク**: 製品×倉庫のコンテキストにおける仕入先特定ロジックの実装とUI反映。

**元:** `backlog.md::8-4` (2026-01-18)

---

### 2-9. SmartRead実行画面の受注管理ページへの統合

**優先度**: Medium
**難易度**: Medium
**想定工数**: 1-2日
**作成日**: 2026-02-05

**背景・課題:**
- SmartReadの実行画面が `/rpa/smartread` にあり、受注データ取り込みのために別ページへ移動が必要
- 受注管理ページ（現在の `/ocr-results`）から直接実行できると、ページ遷移なしで作業が完結する
- RPAページは設定管理の役割に特化すべき

**改善案:**
1. **受注管理ページにアップロードボタンを追加**
   - ページヘッダーまたはアクションエリアに「SmartReadで取込」ボタン
   - クリックでモーダルダイアログを表示

2. **アップロードモーダルの実装**
   - ファイル選択UI（ドラッグ&ドロップ対応）
   - SmartRead設定の選択（プリセット）
   - アップロード → 処理実行
   - 進捗表示（処理中・完了）

3. **処理完了後の挙動**
   - モーダルを閉じて受注管理ページに留まる
   - 新しいOCR結果が自動的にリストに追加される
   - トースト通知で完了を通知

4. **RPAページの役割変更**
   - SmartRead設定の管理（プリセット作成・編集）
   - 監視フォルダ設定
   - 実行履歴の詳細確認

**技術的検討:**
- 既存の `SmartReadUploadPanel` コンポーネントを再利用
- モーダルコンポーネント: shadcn/ui Dialog
- 状態管理: TanStack Query の mutation
- 処理完了検知: ポーリングまたは既存の通知システム連携

**関連タスク:**
- `/ocr-results` のルート名変更（将来タスク）
- 2-10. SmartRead OCR処理完了通知機能（下記）

**元:** ユーザー要望 (2026-02-05)

---

### 2-10. SmartRead OCR処理完了通知機能

**優先度**: Medium
**難易度**: Medium
**想定工数**: 1-2日

**背景・課題:**
- SmartRead OCR処理（ファイルアップロード・監視フォルダ）はバックグラウンドで実行される
- ユーザーが処理中に他のページに移動すると、処理完了を知る手段がない
- OCR結果ページを定期的に確認する必要があり、UXが悪い

**現状の動作:**
1. ファイルをアップロード → バックグラウンド処理開始
   - 右側（アップロード）: FastAPI `BackgroundTasks` (非同期、軽量)
   - 左側（監視フォルダ）: `threading.Thread` (同期I/O、ZIP処理等の重い処理)
2. 即座に202 Acceptedレスポンス
3. ユーザーがページを離れても処理は継続される ✅
4. しかし、**処理完了の通知がない** ❌

**注意:** 左右で異なる並行処理方式を使用しているが、これは処理の重さに応じた最適化であり、
最終的なOCR結果の保存先は共通（`smartread_wide_data`, `smartread_long_data`テーブル）。

**要件:**
1. **リアルタイム通知** (Phase 1)
   - OCR処理が完了したらブラウザ通知またはトースト通知
   - 他のページにいても通知を受け取れる

2. **通知履歴の保存** (Phase 2)
   - 未読通知をスタックして保存
   - ヘッダーにベルアイコン + 未読バッジ
   - 通知一覧ドロップダウンで確認可能
   - 「OCR読み込み完了: ファイル名.pdf」等の詳細表示

**技術的アプローチ:**

**Option 1: WebSocket / Server-Sent Events (SSE)**
- リアルタイム双方向通信
- バックエンドから処理完了時にpush通知
- 実装コスト: 高

**Option 2: ポーリング (推奨)**
- フロントエンドが定期的に `/api/notifications` をチェック
- 実装コスト: 低
- React QueryのrefetchIntervalで簡単実装可能

**実装タスク:**
1. バックエンド:
   - 通知テーブル作成 (user_id, message, type, read, created_at)
   - SmartRead処理完了時に通知レコード挿入
   - GET /api/notifications エンドポイント (未読通知取得)
   - PATCH /api/notifications/{id}/read エンドポイント (既読化)

2. フロントエンド:
   - 通知コンテキスト/ストア (Jotai)
   - ヘッダーにベルアイコン + 未読バッジ
   - 通知ドロップダウンコンポーネント
   - useNotifications hook (ポーリング: 30秒間隔)
   - ブラウザ通知API統合 (Notification API)

3. SmartRead統合:
   - `_run_simple_sync_background` 処理完了時に通知作成
   - PAD Run完了時に通知作成

**参考実装:**
- GitHub通知システム
- Slack通知センター

**元:** ユーザー要望 (2026-01-30)

---

### 2-10. SmartRead: ファイルアップロードとフォルダ監視の処理統一

**優先度**: Medium
**難易度**: Medium
**想定工数**: 1-2日
**前提**: 本番環境でログ確認後に着手

**背景・課題:**
- 現在、右側（ファイルアップロード）と左側（監視フォルダ）で異なる処理方式を使用
- 右側: `/analyze-simple` → `BackgroundTasks` → `sync_with_simple_flow`
- 左側: `/pad-runs` → `threading.Thread` → `execute_run`
- 右側の処理が実際に動作していたか不明（OCR結果に重複がない = 動いていない可能性）
- 処理パスが分かれているため、バグの混入リスクが高い

**現状の問題点:**
```
右側（アップロード）:
  UploadFile受信 → analyze-simple API
    → BackgroundTasks.add_task(_run_simple_sync_background)
    → SmartReadService.sync_with_simple_flow (async)
    → OCR結果保存（動作未確認）

左側（監視フォルダ）:
  filenames受信 → pad-runs API
    → threading.Thread(execute_run)
    → SmartReadPadRunnerService.execute_run (sync)
    → OCR結果保存（動作確認済み ✅）
```

**統一方針:**
- **右側を左側（PAD Run）方式に統一**
- わざわざ監視フォルダに一時保存せず、アップロードファイルを直接PAD Runに渡す
- 同じ処理パスを通ることで、確実性とメンテナンス性を向上

**実装タスク:**

1. **バックエンド:**
   - 新エンドポイント追加: `POST /configs/{config_id}/pad-runs/upload`
   - `UploadFile` を受け取り、PAD Runを開始
   - 内部で `SmartReadPadRunnerService.execute_run` を使用
   - 一時ファイル保存は不要（メモリ上で処理）

2. **フロントエンド:**
   - `SmartReadUploadPanel` を `useStartPadRun` 相当のhookに変更
   - 既存の `useAnalyzeFile` を廃止
   - `handleAnalyzeSuccess` は既に修正済み（タスクリスト更新）

3. **既存コードの整理:**
   - `/analyze-simple` エンドポイントを非推奨化（または削除）
   - `sync_with_simple_flow` の使用箇所を確認・整理

**技術的詳細:**

```python
# 新エンドポイント例
@router.post("/configs/{config_id}/pad-runs/upload")
async def start_pad_run_from_upload(
    config_id: int,
    file: UploadFile,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadPadRunStartResponse:
    """アップロードファイルからPAD Runを開始."""
    file_content = await file.read()
    filename = file.filename or "uploaded_file"

    # 一時ファイルとして扱う（監視フォルダ不要）
    runner = SmartReadPadRunnerService(uow.session)
    run_id = runner.start_run_from_upload(config_id, filename, file_content)

    # 既存のPAD Run方式でバックグラウンド実行
    # ...
```

**メリット:**
1. 左右で同じコードパスを通る → バグが減る
2. PAD Runのステータス管理を統一利用 → デバッグしやすい
3. 実績のある方式に統一 → 確実性が向上
4. コードの重複を削減 → メンテナンス性向上

**注意事項:**
- 本番環境で右側の動作ログを確認してから着手
- もし右側が実際に動いていた場合、統一による影響を慎重に評価

**関連ファイル:**
- `backend/app/presentation/api/routes/rpa/smartread_router.py`
- `backend/app/application/services/smartread/pad_runner_service.py`
- `frontend/src/features/rpa/smartread/components/SmartReadUploadPanel.tsx`
- `frontend/src/features/rpa/smartread/hooks/file-hooks.ts`

**元:** ユーザー要望 (2026-01-30)

---

---

### 2-11. ログレベルの動的変更機能

**優先度**: 中
**作成**: 2026-02-01
**カテゴリ**: 運用・監視

**背景:**
- システム設定画面でログレベルを DEBUG に変更しても、実行中のバックエンドには反映されない
- ログレベルは起動時に `settings.LOG_LEVEL` から設定され、以降は固定される
- デバッグ時にバックエンドの再起動が必要で、運用上不便

**現状の動作:**
1. システム設定画面でログレベルを変更 → DB (`system_configs`) に保存
2. バックエンド起動時に `configure_logging()` が `settings.LOG_LEVEL` を読み込み
3. 実行中は `logging.getLogger().setLevel()` を呼んでも、構造化ログ設定が再構築されない

**タスク内容:**
1. ログレベル変更APIエンドポイントの追加 (`POST /api/admin/log-level`)
2. `configure_logging()` を呼び出して、実行中のログ設定を更新
3. システム設定画面にログレベル変更ボタンを追加（または保存時に自動反映）

**参考ファイル:**
- `backend/app/core/logging.py` - `configure_logging()` 関数
- `backend/app/core/config.py` - `LOG_LEVEL` 設定
- `frontend/src/features/system/SystemSettingsPage.tsx` - システム設定画面

---

### 2-12. E2Eテストのエラーハンドリング改善

**優先度**: 中
**作成**: 2026-02-01
**カテゴリ**: テスト品質

**背景:**
- E2Eテストの `api-client.ts` で一部のエラーを握りつぶしている
- `generateTestData()` がタイムアウトした場合、警告のみ出して続行する
- テスト失敗の原因が不明瞭になる

**タスク内容:**
1. `api-client.ts` の全エラーハンドリング箇所を精査
2. 握りつぶすべきエラーと、スローすべきエラーを明確化
3. エラーメッセージを改善し、デバッグしやすくする

**参考:**
- `frontend/e2e/fixtures/api-client.ts` - L150-162 (`generateTestData`)
- `frontend/e2e/fixtures/db-reset.ts` - 修正済み（エラーをスロー）

---

### 2-13. テストデータ生成が warehouse/product データを作成しない

**優先度**: 中
**作成**: 2026-02-01
**カテゴリ**: E2Eテスト・テストデータ

**症状:**
- `POST /api/admin/test-data/generate` を呼び出しても、warehouse/product データが生成されない。
- `e2e-02-save-persistence.spec.ts` の2テストが一時的にスキップされている。

**影響範囲:**
- 倉庫マスタ・製品マスタのE2Eテストが実行できない。
- 手動でのテストデータ準備が必要。

**推奨対応:**
1. バックエンドの `test-data/generate` エンドポイント実装を調査
2. warehouse/product データ生成ロジックを追加
3. e2e-02 の `test.skip()` を削除して再有効化

**現状回避策:**
- 該当テストを `test.skip(true, "テストデータ生成が倉庫/製品を作成しないため、一時的にスキップ")` で一時スキップ。

**関連ファイル:**
- `frontend/e2e/specs/p0/e2e-02-save-persistence.spec.ts` (L27, L159)
- バックエンド: `app/presentation/api/routes/admin/*` (test-data生成エンドポイント)

---

### 2-14. SmartRead CSV変換ロジックの改善

**優先度**: 中
**作成**: 2026-02-02
**カテゴリ**: RPA・データ処理

**背景:**
- `SmartReadCsvTransformer` による横持ち→縦持ち変換において、データの信頼性とエラー検知能力を向上させる。

**タスク内容:**
1. **縦持ちデータの重複チェック機能の実装**
   - 変換後のデータ（`long_data`）内で、同一の材質・Lot No・数量等を持つレコードが重複して生成されていないかチェックするロジックの追加。
2. **明細未生成時の警告機能の実装**
   - 明細項目が1件も抽出されなかった場合、CSVフォーマットの不一致（列名の変更など）の可能性があるため、ユーザーに警告を出す仕組みの導入。

**関連ファイル:**
- `backend/app/application/services/smartread/csv_transformer.py`
- `docs/smartread_csv_validation_report.md`

### 2-15. RPA Status Enum のレガシーエイリアス削除

**優先度:** 低（RPA機能改修時にまとめて対応）
**作成:** 2026-02-06
**カテゴリ:** コード品質・リファクタリング
**工数:** 0.5日

**背景:**
後方互換エイリアス一掃（`32bc1943`）で大半のエイリアスを削除したが、`RpaRunStatus` の旧ステータス名エイリアス（8個）は使用箇所が38箇所・7ファイルに及ぶため見送った。

---

### 2-16. フロントエンド厳格Lint対応の残存課題解消 (ESLint v10)

**優先度:** 中（長期的に解消）
**作成:** 2026-02-07
**カテゴリ:** コード品質・リファクタリング

**背景:**
ESLint v10へのアップグレード時に、厳格なルール（`no-explicit-any`, `no-non-null-assertion` 等）を導入したが、既存コードの修正コストが高いため、一時的に `eslint.config.js` で特定のルールを `off` にして対応した。
真の厳格さを達成するためには、コード側を修正してこれらの無効化設定を削除する必要がある。

**対象ルール (eslint.config.js で off になっているもの):**
- `@typescript-eslint/no-non-null-assertion`
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-empty-function`
- `@typescript-eslint/no-invalid-void-type`
- `@typescript-eslint/no-extraneous-class`
- `no-useless-assignment`
- `@typescript-eslint/prefer-for-of`
- `@typescript-eslint/no-dynamic-delete`
- `preserve-caught-error` (e2e)

**タスク内容:**
1. 各ルール違反箇所の修正（コード修正、型定義の改善）
2. `eslint.config.js` から該当ルールの `off` 設定を削除
3. CIでリントエラーが出ないことを確認

### 2-17. ExcelView: 現在在庫の計算ロジック不備

**優先度:** 中
**作成:** 2026-02-07
**カテゴリ:** 業務ロジック・バグ

**症状:**
- 引当Excel表示画面において、「現在在庫」の数値が表示上の出荷数（引当数）を反映していない。
- 本来は `入庫数 - 合計引当数`（またはそれに準ずる計算）が必要だが、正しく更新・計算されていない可能性がある。

**タスク内容:**
1. `useExcelViewData.ts` 内の計算ロジックを調査
2. 引当変更時に合計在庫・残在庫が動的に再計算されるよう修正

**備考:**
`e2e` ディレクトリについてはテストコード特有の事情で一部許容しても良いが、`src` 配下は原則解消すべき。

---

### 2-17. jsdom v28 アップグレード (WebSocket回帰対応待ち)

**優先度:** 低（回帰バグ修正待ち）
**作成:** 2026-02-07
**カテゴリ:** 依存関係・テスト環境

**背景:**
jsdom v28.0.0 で WebSocket の接続制限に関する既知の退行（Regression）が報告されている（nodejs/undici に起因）。
本プロジェクトでは `LogViewer.tsx` (frontend) および `backend/tests/api/test_logs_websocket.py` (backend test, though running in python) で WebSocket を使用しており、フロントエンドのテスト(`vitest`)環境として `jsdom` を採用しているため、影響を受ける可能性がある。

**タスク内容:**
1. jsdom v28 以降の新しいパッチリリースで当該バグが修正されたか確認
2. 修正確認後、`jsdom` を v28.0.0+ にアップグレード
3. WebSocketを使用するコンポーネントのテストが正常に動作することを確認

**参照:**
- jsdom v28.0.0 リリースノート: "Known Regression: WebSocket connection limits bug"



**対象:** `backend/app/infrastructure/persistence/models/rpa_models.py` L176-184
```python
# Legacy aliases for backward compatibility
DOWNLOADED = "step1_done"
DRAFT = "step1_done"
READY_FOR_STEP2 = "step2_confirmed"
STEP2_RUNNING = "step3_running"
STEP3_DONE_WAITING_EXTERNAL = "step3_done"
READY_FOR_STEP4_CHECK = "step4_checking"
STEP4_CHECK_RUNNING = "step4_checking"
READY_FOR_STEP4_REVIEW = "step4_review"
```

**対象ファイル（書き換え必要）:**
- `app/application/services/rpa/orchestrator.py` (11箇所)
- `app/domain/rpa/state_manager.py` (6箇所)
- `app/application/services/test_data/rpa_material_delivery.py` (5箇所)
- `tests/unit/test_material_delivery_orchestrator.py` (8箇所)
- `tests/api/test_rpa_material_delivery.py` (6箇所)
- `scripts/seed_rpa.py` (2箇所)

**実施内容:**
1. 旧エイリアス名を正式なステップベース名（`STEP1_DONE`, `STEP2_CONFIRMED` 等）に統一
2. 全38箇所の使用箇所を書き換え
3. レガシーエイリアス定義を削除

---

### 2-16. 本番環境の不足インデックス追加 (idx_lot_receipts_fefo_allocation)

**優先度:** 中
**作成:** 2026-02-07
**カテゴリ:** パフォーマンス・データベース
**工数:** 0.5日

**背景:**
- `LotReceipt` モデルには `idx_lot_receipts_fefo_allocation` が定義されているが、マイグレーションファイルが存在しない。
- テスト環境では `scripts/setup_test_db.py` で手動作成しているが、本番環境には適用されていない。
- FEFO引き当て処理のパフォーマンスに影響する可能性がある。

**タスク内容:**
1. Alembicマイグレーションファイルを生成 (`uv run alembic revision --autogenerate`)
2. 生成されたファイルを確認し、インデックス作成が含まれていることを検証
3. PR作成とマージ
4. (オプション) `scripts/setup_test_db.py` の手動作成処理を削除（マイグレーション適用に任せる）

**関連ファイル:**
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py`
- `backend/alembic/baseline_2026_02_06.sql`

---

### 2-18. フィールド共通化

**優先度:** 中  
**作成:** 2026-02-07  
**カテゴリ:** フロントエンド・リファクタリング

**背景:**
- 画面ごとにフィールド定義・バリデーション・表示ロジックが重複している可能性がある。

**タスク内容:**
1. フォーム系フィールドの重複定義を棚卸しする。
2. 共通化可能な型・定義・バリデーションを抽出する。
3. 段階的に共通モジュールへ統合する。

---

### 2-19. コンポーネント化

**優先度:** 中  
**作成:** 2026-02-07  
**カテゴリ:** フロントエンド・リファクタリング

**背景:**
- 同じUIパターンが複数画面に散在し、変更時の修正箇所が増えている。

**タスク内容:**
1. 再利用性の高いUI要素（入力行、テーブル断片、モーダル断片など）を特定する。
2. 既存実装を壊さない範囲で共通コンポーネントへ切り出す。
3. 呼び出し側のprops設計を統一する。

---

### 2-20. 追加の共通化/コンポーネント化候補の洗い出し

**優先度:** 中  
**作成:** 2026-02-07  
**カテゴリ:** 設計改善・技術負債返済

**背景:**
- 既知の共通化対象以外にも、未整理の重複実装が残っている懸念がある。

**タスク内容:**
1. 画面横断で重複ロジック・重複UIの調査を行う。
2. 共通化優先度（効果/工数/影響範囲）を付けて一覧化する。
3. 短期対応と中長期対応に分けて実施順を決める。

---

### 2-21. ログオフ直後のナビゲーション表示不整合

**優先度:** 中  
**作成:** 2026-02-07  
**カテゴリ:** 認証・UI/UX

**症状:**
- ログオフ直後でもログインユーザー向けメニューが表示されたままになる場合がある。
- ゲスト状態ではゲスト向けナビゲーションのみ表示されるべき。

**タスク内容:**
1. ログアウト時の認証状態クリアとナビゲーション再描画フローを確認する。
2. 認証状態に応じたメニュー出し分け条件を見直す。
3. ログアウト直後・リロード後の表示をE2Eまたは画面テストで担保する。

---

## 3. DB/UI整合性・データ表示改善

---

### 3-3. 大量データ表示の完全対応 (ページネーション)

**優先度**: High
**難易度**: Medium
**想定工数**: 2-3日

**背景・課題:**
- 一部のAPI（ロット取得等）にデフォルトの `limit: 100` があり、ページングがないため大量データ時に欠落が発生している。
- 全件取得してからクライアント側で絞り込む実装を廃止し、ネットワーク・メモリ負荷を軽減する必要がある。

**タスク内容:**
1. ロット一覧および在庫一覧APIへの完全なサーバーサイドページネーション導入。
2. フロントエンドでの無限スクロールまたはバーチャルスクロール対応。

**元:** `FUTURE_IMPROVEMENTS.md`

---

## 4. アーキテクチャ/品質改善

### 4-0. Alembicマイグレーション: ビュー再生成の自動化

**優先度**: 低
**作成**: 2026-02-04
**カテゴリ**: インフラ・DB・開発体験

**背景:**
- 現在、データベースビューは最後のマイグレーション (`62a340dbe783_recreate_views_after_schema_changes.py`) で `create_views.sql` を実行して再生成される
- 新しいマイグレーションを追加する度に、以下の手動作業が必要になる：
  1. 既存の最後のマイグレーションから `create_views.sql` 実行処理を削除
  2. 新しいマイグレーションの最後に `create_views.sql` 実行処理を追加
- この手動作業は忘れやすく、ビューの整合性問題を引き起こす可能性がある

**課題:**
- 中間マイグレーションでビューを再生成すると、スキーマが不完全な状態でエラーが発生する
- かといって手動で毎回移動させるのは煩雑でエラーが起きやすい

**提案される解決策:**

**Option 1: Alembic hooks を使用した自動化**
- `alembic/env.py` で `after_upgrade` hook を使用
- `alembic upgrade head` 実行後に自動的に `create_views.sql` を実行
- メリット: 各マイグレーションファイルに記述不要、完全自動化
- デメリット: downgrade時の対応が複雑

**Option 2: 専用のビュー管理スクリプト**
- `scripts/recreate_views.py` のような独立したスクリプトを作成
- マイグレーション後に手動で実行: `make db-recreate-views`
- メリット: シンプル、明示的、downgradeの影響を受けない
- デメリット: 実行を忘れる可能性がある

**Option 3: 最終マイグレーションのマーカー**
- 特殊な命名規則（例: `zz_final_views.py`）で最終マイグレーションを識別
- 新規マイグレーション作成時に自動リネーム
- メリット: ファイル名で意図が明確
- デメリット: 自動化には追加ツールが必要

**推奨アプローチ:** Option 1 (Alembic hooks)
- 最も自動化されており、人的エラーを排除できる
- `alembic/env.py` の `run_migrations_online()` に数行追加するだけで実装可能

**関連ファイル:**
- `backend/alembic/env.py`
- `backend/alembic/versions/62a340dbe783_recreate_views_after_schema_changes.py`
- `backend/sql/views/create_views.sql`

---

### 4-1. useQuery のエラー処理追加（Phase 2）

- `AllocationDialog.tsx`, `ForecastsTab.tsx`, `InboundPlansTab.tsx`, `WithdrawalCalendar.tsx` など。

**元:** `backlog.md::4-1` (2026-01-18)

---

### 4-3. 削除ダイアログの統合

- `SoftDeleteDialog`, `PermanentDeleteDialog`, `BulkSoftDeleteDialog`, `BulkPermanentDeleteDialog` を統合。

**元:** `backlog.md::4-3` (2026-01-18)

---

### 4-4. バックエンド: Soft Delete Utilsにプロトコルを導入

**優先度**: Medium (any型削減 Phase 2)
**対象**: 17箇所

**場所**: `app/application/services/common/soft_delete_utils.py`

**現状:**
```python
def get_product_name(product: Any, default: str = "") -> str:
    """製品名を安全に取得 (論理削除対応)"""
    if product is None:
        return default
    return getattr(product, "product_name", default)
```

**対応:**
```python
from typing import Protocol, Optional

class HasProductName(Protocol):
    product_name: str

def get_product_name(product: Optional[HasProductName], default: str = "") -> str:
    """製品名を安全に取得 (論理削除対応)"""
    if product is None:
        return default
    return product.product_name
```

**元:** `any-type-reduction.md` (2026-01-18)

---

### 4-6. バックエンド: ProductMapping 関連コードの削除

**優先度**: Low
**作成**: 2026-01-31
**カテゴリ**: リファクタリング

**背景:**
- 2026-01-31のマスタページ改修により、フロントエンドから「商品マッピング（`ProductMapping`）」ページが削除され、機能は「得意先品番マッピング（`CustomerItem`）」に一元化された。
- しかし、バックエンドには `ProductMapping` モデル、Router、Service、Import/Exportロジックが残存している。
- これらは `replenishment/engine.py` 等から参照されており、影響調査が必要なため今回は温存された。

**タスク内容:**
1. `ProductMapping` の参照箇所を洗い出す。
2. 必要なロジック（もしあれば）を `CustomerItem` ベースに移行する。
3. 以下のファイルを削除・修正する:
   - `backend/app/infrastructure/persistence/models/masters_models.py` (Class `ProductMapping`)
   - `backend/app/presentation/api/routes/masters/product_mappings_router.py`
   - `backend/app/application/services/masters/product_mappings_service.py`
   - `backend/app/presentation/schemas/masters/masters_schema.py`
   - その他 Import/Export 関連
4. テストを修正する。

**元:** 2026-01-31 マスタページ改修


## 5. テスト・自動化

**📚 参考資料:**
- [Testing Strategy](./TESTING_STRATEGY.md) - 詳細なテスト戦略とテストピラミッド
- [Testing Quick Start Guide](./TESTING_QUICKSTART.md) - 今すぐ使えるテスト実行ガイド

### 5-1. 統合テスト・E2Eテストの拡充

**優先度**: High
**作成**: 2026-01-30
**更新**: 2026-02-05（SmartRead/Excel View/マスタ周りのスモークテスト追加完了）
**カテゴリ**: 品質保証・回帰テスト

**背景:**
昨日の大規模改修（Phase 2移行）後、手動テストで以下の500エラーが発見されました。これらはテストで検出されず、本番相当の環境で初めて発覚しました：

1. **単位換算ページ**: SQLAlchemy join構文ミス
2. **一括エクスポート**: Pythonスコープルール違反（ローカルインポートの重複）
3. **材料ロット管理ページ**: `lot_number` NULL/空文字列のPydanticバリデーションエラー

**課題:**
- 主要APIエンドポイントの統合テストが不足
- 画面遷移・UI操作を含むE2Eテストが存在しない
- テストデータに境界値ケース（NULL値など）が不足

**タスク内容:**

#### 5-1-1. バックエンド統合テストの追加
- [ ] 主要APIエンドポイントの統合テスト（実際のDB接続）
  - マスタ系: 顧客、製品、仕入先、倉庫、単位換算、etc.
  - トランザクション系: ロット、受注、引当、入出庫
  - システム系: 一括エクスポート、ログビューア
- [ ] エッジケース・境界値テスト
  - NULL許容フィールドのテスト
  - 空文字列、ゼロ値のテスト
  - 外部キー制約違反のテスト
- [ ] SQLクエリのテスト
  - JOIN構文の正当性
  - N+1問題の検出
  - パフォーマンステスト

#### 5-1-2. E2Eテスト基盤の構築
- [x] E2Eテストフレームワークの選定・導入（Playwright）
- [x] **スモークテスト追加完了（2026-02-05）**
  - `frontend/e2e/specs/smoke/smartread-smoke.spec.ts` - SmartReadページ表示確認
  - `frontend/e2e/specs/smoke/excel-view-smoke.spec.ts` - Excel Viewページ表示確認
  - `frontend/e2e/specs/smoke/masters-smoke.spec.ts` - マスタページ表示確認
  - 実行コマンド: `make test-smoke` (30秒)
- [x] **バックエンド統合テスト追加**
  - `backend/tests/integration/test_smartread_integration.py` - SmartRead OCR → 注文生成フロー
- [ ] [P0] E2Eテストの永続化検証失敗の調査と修正
    - 状況: `e2e-02` テストで保存API自体がフロントエンドから送信されていない現象を確認。
    - 原因調査レポート: [e2e_persistence_failure_report.md](../investigation/e2e_persistence_failure_report.md)
    - [x] 並列実行時のDBリセット干渉 (`e2e-04`) は修正済み。
- [ ] **クリティカルパステストの追加（TODO）**
  - SmartRead: OCR画像アップロード → 注文生成の完全フロー
  - マスタCRUD: 商品マスタ作成 → 在庫登録での使用
  - Excel View: フィルタ/ソート → セル編集 → 保存
- [ ] 主要ユーザーフロー
  - ログイン → ダッシュボード → マスタ画面遷移
  - ロット新規登録 → 在庫確認
  - 受注登録 → 引当 → 出庫
  - データエクスポート
- [ ] クリティカルパスのテスト
  - FEFO引当アルゴリズム
  - 在庫計算ロジック
  - 権限制御（RBAC）

#### 5-1-3. テストデータの拡充
- [ ] 境界値・異常系のテストデータ追加
  - `lot_number` が NULL/空文字列のロット
  - 消費期限切れのロット
  - 論理削除されたマスタを参照するデータ
- [ ] `factory_boy` によるテストデータ生成の自動化

**想定工数**: 1-2週間（段階的に実装）

**元:** 2026-01-30 手動テスト結果のレビュー

---

### 5-2. テスト基盤拡張（低優先度）

- **C3: Data Factory (Backend) 拡張**: `factory_boy` 等を使用したバックエンドテストデータ生成ファクトリの整備。現在は `services/test_data_generator.py` で代用中。
- **C4: Test Matrix 定義**: テストケースの組み合わせ表（マトリクス）のドキュメント化と管理。
- **Phase D: API統合テスト拡張**: 以下の観点でのバックエンド統合テスト拡充。
  - 主要エンティティCRUD（正常系/異常系）
  - データ整合性テスト（トランザクション境界など）
  - 権限テスト（RBACの徹底確認）

**元:** `backlog.md::5-1` (2026-01-18)

---

### 5-3. テストDBでAlembic Migrationsを実行

**優先度**: Medium
**難易度**: Medium
**想定工数**: 2-3日

**背景:**
現在、テスト環境では `Base.metadata.create_all()` でテーブルを作成しているため、本番環境（Alembic Migrations使用）と以下の差異が発生します：

1. **server_default値の違い**
   - 例: `consumed_quantity` カラムは、モデル定義では `server_default=text("0")` だが、Migrationでは `server_default=None`
2. **Database Triggersの未適用**
3. **Constraintsの違い**
4. **Migration自体のバグ検出不可**

**問題点 (2026-01-18時点):**
- 現在70+ migrationsが存在し、多数のmergepoint/branchpointがある
- 依存関係が複雑で、テーブルが正しい順序で作成されない

**実装タイミング:**
以下のいずれかの条件を満たした時点で実装：
1. Migrationの統合・整理が完了（70+ → 10-20個程度）
2. スキーマの大幅変更時
3. Migration関連のバグが頻発

**暫定対策（実装済み）:**
1. アプリケーション層でのデフォルト値設定
2. テストコードの修正
3. ドキュメント化

**元:** `FUTURE_IMPROVEMENTS.md`

---





### 5-5. E2Eテストの失敗修正 (19件)

**優先度**: Medium
**作成**: 2026-01-26
**現状**: 61テスト中 42 passed / 19 failed

**失敗カテゴリ:**

1. **ログインフォームセレクタ問題** (複数テスト)
   - `getByLabel('ユーザー名')` が見つからない
   - 対象: `e2e-04-permission.spec.ts` 等
   - 原因: ログインUIの変更にテストが追従していない

2. **テストデータ不整合**
   - `warehouse-crud.spec.ts`: "Existing Warehouse" が存在しない
   - `customer-items.spec.ts`: 期待するテストデータがない

3. **タイムアウト/応答遅延**
   - `e2e-06-error-handling.spec.ts`: 長時間レスポンスのハンドリング

**失敗テスト一覧:**
- `e2e/allocation.spec.ts`
- `e2e/customer-items.spec.ts`
- `e2e/rpa-material-delivery.spec.ts`
- `e2e/shortage-auto-order.spec.ts`
- `e2e/specs/p0/e2e-01-order-flow.spec.ts`
- `e2e/specs/p0/e2e-02-save-persistence.spec.ts` (2件)
- `e2e/specs/p0/e2e-03-double-submit.spec.ts` (2件)
- `e2e/specs/p0/e2e-04-permission.spec.ts` (4件)
- `e2e/specs/p0/e2e-05-list-filter.spec.ts` (4件)
- `e2e/specs/p0/e2e-06-error-handling.spec.ts`
- `e2e/warehouse-crud.spec.ts`

**対応方針:**
1. ログインセレクタを現在のUI構造に合わせて更新
2. テストフィクスチャ/シードデータの整備
3. タイムアウト値の調整またはテスト設計の見直し

**元:** SSOT化PR E2Eテスト実行結果 (2026-01-26)

---

## 6. 機能改善・中長期タスク

### 6-1. DB/UI整合性修正に伴うエクスポート機能

- Forecasts / Orders / Inventory/Lots の Excel エクスポート実装。

**元:** `backlog.md::6-1` (2026-01-18)

---

### 6-2. ダッシュボードの可視化（recharts）

- KPIのみのダッシュボードにグラフを追加。

**元:** `backlog.md::6-2` (2026-01-18)

---

### 6-3. SAP連携タスク

- 本番API接続、二重計上防止のべき等性対応、在庫同期。

**元:** `backlog.md::6-3` (2026-01-18)

---

### 6-4. フォーキャスト単位の引当推奨生成

- 既存は全期間一括のみ。フォーキャストグループ単位での生成が必要。

**元:** `backlog.md::6-4` (2026-01-18)

---

### 6-5. 入荷予定の倉庫データ取得改善

- `InboundPlan`ヘッダーに倉庫情報がなく「未指定」に集約される問題。

**元:** `backlog.md::6-5` (2026-01-18)

---

### 6-6. OpenAPI型定義の導入

- `openapi-typescript` を利用した型生成でフロント/バックの整合性を確保。

**元:** `backlog.md::6-6` (2026-01-18)

---

### 6-7. 商品識別設計のビジネス実態への適合

**優先度**: Medium
**難易度**: High
**想定工数**: 5-7日

**背景・課題:**
- 現状の実装は `maker_part_code`（メーカー品番/内部コード）中心だが、ビジネス実態は9割が「先方品番（Customer Part No）」ベースである。
- ユーザーの直感に合わせた識別子設計への見直しが必要。

**タスク内容:**
1. 先方品番をプライマリな検索/識別キーとして扱えるよう設計を見直す。
2. `Product` マスタにおける複数品番（メーカー品番、先方品番、内部コード）の優先順位と用途を整理し、命名を改善する。

**関連:** `MASTER_DATA_FIELD_ALIGNMENT_TASKS.md::4`

**元:** `FUTURE_IMPROVEMENTS.md` & `MASTER_DATA_FIELD_ALIGNMENT_TASKS.md` (2026-01-19)

---

### 6-8. Phase 4以降：将来的な改善・拡張

**優先度**: Low〜Medium
**難易度**: Medium〜High

**タスク内容:**
1. **マッピング設定のUI化**
   - 現在コードベースで行っているOCRテキスト置換や品目マッピングの設定を、管理用UIから変更可能にする。
2. **AIを活用した補完機能**
   - 過去の編集履歴を教師データとして学習し、OCR結果の不明瞭な箇所をより高い精度で自動補完する。
3. **ダッシュボード機能**
   - ロット管理状況やOCR処理速度、エラー発生率などを視覚化するダッシュボードの追加。
4. **OCR結果と受注管理の統合**
   - OCRで読み取った結果を受注データとして直接取り込み、受注管理機能とシームレスに連携させることで、入力作業のさらなる自動化を図る。
5. **scripts と tools ディレクトリの整理・定義明確化**
   - 現在、運用系スクリプト（scripts）と開発・CIツール（tools）の境界が曖昧なため、役割を再定義して整理する。
   - `scripts`: 本番/テスト環境のデータ補正、バックアップ、デプロイなどの運用・メンテナンス系。
   - `tools`: 静的解析、ドキュメント自動生成、開発補助ユーティリティなどの開発・CI系。
6. **DB整合性維持の自動化 (DB Triggers)**
   - `lot_master` の集計値（初回入荷日、最終有効期限等）をDBトリガーで自動更新し、アプリケーション側での更新漏れを防ぐ。

**元:** `FUTURE_IMPROVEMENTS.md`

---

## 7. コード品質・アンチパターン検出

### 7-1. テストアンチパターンの検出と修正

**優先度**: Medium
**作成**: 2026-01-30
**カテゴリ**: コード品質・保守性

**背景:**
テスト修正中に、複数のアンチパターンが発見されました：
1. **独自test_dbセッション**: 21個のAPIテストファイルが独自のDBセッションを作成し、グローバルfixtureと互換性がない
2. **fixture の重複**: 同じ master data を各ファイルで重複して定義
3. **トランザクション管理の不統一**: commit/flush/rollback の使い分けが統一されていない

**タスク内容:**

#### 7-1-1. 既知アンチパターンの修正
- [x] 独自test_dbセッションの削除（21ファイル）→ グローバル `db` fixture に統一 (ARCHIVE.mdへ移動)

#### 7-1-2. アンチパターン検出ツールの導入
- [ ] pytest-best-practices などのlinterツール検討
- [ ] カスタムpytest pluginでアンチパターン検出
  - 独自セッション作成の検出
  - fixture スコープの不適切な使用
  - 重複するsetup/teardown
- [ ] CI/CDに組み込み

#### 7-1-3. テストベストプラクティスのドキュメント化
- [ ] `docs/standards/testing.md` の作成
  - Fixture の使い方
  - トランザクション管理
  - テストデータの作成パターン
  - 避けるべきアンチパターン

**想定工数**: 2-3日

**元:** 2026-01-30 テスト修正作業

---

## 9. 保留（再現確認・調査待ち）

### 9-1. フォーキャスト編集後の更新問題

- フォーキャスト編集後、計画引当サマリ・関連受注が更新されない。
- 手動リフレッシュでは回避可能。バックエンド再計算の確認が必要。

**元:** `backlog.md::7-1` (2026-01-18)

---

### 9-2. 過去データの可視性向上

- **入荷予定一覧**: 過去データの表示確認と「過去/未来」タブまたはフィルタの実装。
- **受注管理**: 過去の受注データの表示確認とステータス/日付フィルタの強化。
- **フォーキャスト一覧**: 「履歴」タブの機能確認とフロントエンド実装（`/history`エンドポイント活用）。

**元:** `backlog.md::8-1` (2026-01-18)

---

### 9-3. RPA通常版 (Step1) の実行不可修正

- **症状**: `/rpa/material-delivery-note` のStep1実行ボタンを押しても、設定キー不一致によりBackendで即座にエラーとなる。
- **原因**: Frontend (`STEP1_URL`) と Backend (`progress_download_url`) の設定キー不整合。
- **対処**: 設定モーダルの保存キー修正、またはBackendの参照キー修正。
- **詳細**: `docs/issues/20260128_RPA_MaterialDelivery_Step1_Failure.md`

**元:** 2026-01-28 調査

---

## 9. 技術負債 (低優先度)

### 9-1. フロントエンド: 外部モジュール型定義を改善

**優先度**: Low (any型削減 Phase 3)
**対象**: 16箇所

**場所**: `src/types/external-modules.d.ts`

**理由**: 外部モジュール(@radix-ui)の型定義が不完全

**対応**: Radix UIの型定義を正確に記述するか、コミュニティ型定義を利用

**元:** `any-type-reduction.md` (2026-01-18)

---

### 9-2. バックエンド: Repository Methodsにジェネリクスを導入

**優先度**: Low (any型削減 Phase 3)
**対象**: 3箇所

**場所**: `app/infrastructure/persistence/repositories/rpa_repository.py`

**現状:**
```python
def add(self, entity: Any) -> None:
    self.db.add(entity)

def refresh(self, entity: Any) -> None:
    self.db.refresh(entity)
```

**対応**: ジェネリクスを使用
```python
from typing import TypeVar
T = TypeVar('T')

def add(self, entity: T) -> None:
    self.db.add(entity)
```

**元:** `any-type-reduction.md` (2026-01-18)

---

### 9-3. バックエンド: Export Serviceの型を改善

**優先度**: Low (any型削減 Phase 3)
**対象**: 2箇所

**場所**: `app/application/services/common/export_service.py`

**対応**: TypedDictまたはプロトコルを使用

**元:** `any-type-reduction.md` (2026-01-18)

---

### 9-4. SmartRead Logging Gaps - errorLogger Integration

**優先度**: Medium
**作成**: 2026-01-21
**関連PR**: feature/smartread-vertical-conversion-fix

**背景:**
PR #454 added `errorLogger` to main features for success/error logging. However, SmartRead feature lacks consistent logging across all operations.

**完了済み:**
- `useTransformToLong` - errorLogger追加済み

**欠落箇所:**
- API Operations (`api.ts`): `syncTaskResults()`, `saveLongData()`, `uploadFile()`, etc.
- Hook Operations (`hooks.ts`): `useSyncTaskResults`, `useSmartReadConfigs`, `useSmartReadTasks`
- Component Operations: `SmartReadResultView`, `SmartReadUploadPanel`, `SmartReadTaskList`

**優先度:**
- High: `useSyncTaskResults`, API file operations, config CRUD
- Medium: User action logging, task list operations
- Low: Backend logging strategy review

**元:** `smartread-logging-gaps.md` (2026-01-21)

---

### 9-5. SmartRead Cache-to-DB Save Inconsistency

**優先度**: Medium
**作成**: 2026-01-21

**問題:**
キャッシュされたデータ（IndexedDB）が自動的にDBに保存されないため、データの永続性が保証されていない。

**推奨対応（オプションC）:**
IDBに「DB保存済み」フラグを追加し、未保存データのみDB保存する。

**実装タスク:**
1. スキーマ変更（`saved_to_db` フィールド追加）
2. 保存ロジック実装
3. 他のフロー修正
4. テスト

**元:** `smartread-cache-db-save-inconsistency.md` (2026-01-21)

---

### 9-6. SSOT統一: CustomerItems 複合キーAPI廃止

**優先度**: Low
**作成**: 2026-01-26
**関連**: customer_item_delivery_settings SSOT化

**背景:**
CustomerItemsのCRUD APIは現在、後方互換性のため`/{customer_id}/{customer_part_no}`形式のエンドポイントを維持している。
`customer_items.id`がSSOTであるため、将来的に`/{id}`ベースに統一すべき。

**対象ファイル:**
- `backend/app/presentation/api/routes/masters/customer_items_router.py`
- `backend/app/application/services/masters/customer_items_service.py`

**廃止対象メソッド:**
- `get_by_key(customer_id, customer_part_no)`
- `update_by_key(customer_id, customer_part_no, ...)`
- `delete_by_key(customer_id, customer_part_no, ...)`
- `restore_by_key(customer_id, customer_part_no)`
- `permanent_delete_by_key(customer_id, customer_part_no)`

**移行手順:**
1. フロントエンドの呼び出し元を`/{id}`形式に移行
2. 後方互換エンドポイントにdeprecation警告を追加
3. 一定期間後に後方互換エンドポイントを削除

**元:** SSOT監査レポート (2026-01-26)

---

### 9-7. SSOT統一: ShipmentTextRequest の customer_item_id 対応

**優先度**: Low
**作成**: 2026-01-26
**依存**: OrderLineモデルへの`customer_item_id`追加

**背景:**
`/shipment-text`エンドポイントは現在`customer_id + product_id`を受け取り、内部で`customer_part_no`に変換している。
OrderLineに`customer_item_id`が追加されれば、直接`customer_item_id`を受け取る形式に移行可能。

**対象ファイル:**
- `backend/app/presentation/schemas/masters/customer_item_delivery_setting_schema.py` (ShipmentTextRequest)
- `backend/app/application/services/masters/customer_item_delivery_setting_service.py` (get_shipment_text)
- `backend/app/infrastructure/persistence/repositories/customer_item_delivery_setting_repository.py` (find_matching_setting, find_customer_part_no)

**前提条件:**
- OrderLine / order_lines テーブルに`customer_item_id`カラムを追加
- 受注作成時に`customer_item_id`を設定するロジックを実装

**元:** SSOT監査レポート (2026-01-26)

---

### 9-8. スキーマ重複解消: SupplierItem

**優先度**: Low
**作成**: 2026-01-26

**背景:**
SupplierItemエンティティに対して2箇所でスキーマが定義されており、メンテナンス性が低下している。

**重複箇所:**
- `backend/app/presentation/schemas/masters/supplier_items_schema.py` (SupplierItemBase, Create, Update, Response)
- `backend/app/presentation/schemas/masters/masters_schema.py:321-367` (同名のスキーマ群)

**対応:**
1. どちらが正として使われているか調査
2. 使用されていない方を削除、または片方を他方へのエイリアスに変更
3. インポート元を統一

**元:** SSOT監査レポート (2026-01-26)

---



### 9-11. 大規模ファイルの分割 (600行超)

**優先度**: Medium
**作成**: 2026-01-26

**背景:**
CLAUDE.md で推奨される300行を大幅に超えるファイルが存在。
保守性・可読性・テスト容易性が低下。

**対象ファイル:**
| ファイル | 行数 | 分割案 |
|----------|------|--------|
| `lot_service.py` | 1177 | LotCreationService, LotQueryService, LotUpdateService に分割 |
| `smartread_router.py` | 1108 | 機能別に複数 APIRouter に分割 |
| `smartread/client.py` | 935 | SmartReadUploader, SmartReadDownloader, SmartReadParser に分割 |
| `forecast_service.py` | 681 | ForecastImportService, ForecastCalculationService に分割 |

---

### 9-14. Infrastructure → Service の逆依存解消

**優先度**: Medium
**作成**: 2026-01-26

**背景:**
Infrastructure層（clients/）がService層にアクセスしている箇所がある。
レイヤードアーキテクチャの依存関係が逆向き。

**対象:**
- `backend/app/infrastructure/clients/lot_client.py`
- `backend/app/infrastructure/clients/inventory_client.py`
- `backend/app/infrastructure/clients/order_client.py`

**対応:**
1. Factoryパターンで依存性注入(DI)を実装
2. または、clientsをapplication層に移動
3. 依存関係: Presentation → Application → Domain → Infrastructure

---

### 9-15. TODO/FIXME コメントの棚卸し

**優先度**: Low
**作成**: 2026-01-26

**背景:**
コード内に19件のTODO/FIXMEコメントが存在。
対応が必要なものと、もはや不要なものが混在している可能性。

**主なTODO:**
- `lots_router.py:461` - "Add permission check"（認証不具合は解消済、詳細なロール制限は今後検討）
- `replenishment_router.py:57` - "Implement persistence"（永続化未実装）
- `smartread_router.py:857` - "SSE実装"（リアルタイム通知未実装）
- `confirm.py:237` - "Support configurable expiry margin"（有効期限マージン設定）

**対応:**
1. 各TODOをBACKLOGの適切なセクションに移動
2. 対応済み/不要なTODOは削除
3. 残すべきTODOには期限やチケット番号を付与

---

### 9-16. InventoryTable 展開キー形式の統一

**優先度**: Low
**作成**: 2026-01-26

**背景:**
`InventoryTable`の行展開で使用するキー形式が2箇所で異なっている。
PR #437 で`getItemKey`に`supplier_id`を追加した際、`useInventoryTableLogic`のキー形式を更新し忘れたことが原因。

現在はハンドラー内で変換処理を行い暫定対応済みだが、根本的にはキー形式を統一すべき。

**現状:**
- `getItemKey` (DataTable行ID): `${supplier_id ?? "all"}-${product_id}-${warehouse_id}` （3部構成）
- `useInventoryTableLogic.expandedRows`: `${productId}-${warehouseId}` （2部構成）

**対象ファイル:**
- `frontend/src/features/inventory/components/InventoryTable.tsx`
- `frontend/src/features/inventory/hooks/useInventoryTableLogic.ts`

**対応案:**
1. `useInventoryTableLogic`のキー形式を3部構成に統一
2. `toggleRow`, `isRowExpanded`, `fetchLotsForItem`等のシグネチャに`supplierId`を追加
3. ハンドラー内の変換処理を削除

---

## 9. ビジネスコンテキスト補足が必要な項目

以下の項目は、コードに「意図・背景」コメントを追加する際に、開発者の判断だけでは記述できない項目です。外部レビューまたはビジネス要件の確認が必要です。

### 9-1. 🔴 最優先（ビジネスロジックの根幹）

#### 過剰予約（オーバーブッキング）の許容範囲

**ファイル**: `stock_calculation.py`, `lot_reservation_service.py`

**質問:**
1. どの程度のオーバーブッキングまで許容するのか？
2. オーバーブッキング時の運用フロー
3. リスク管理

#### FEFO vs FIFO の使い分け基準

**ファイル**: `allocation_policy.py`, 製品マスタ

**質問:**
1. 製品カテゴリごとの具体的な適用ルール
2. 有効期限の設定基準
3. 顧客要求への対応

#### SAP連携のタイミングと責任範囲

**ファイル**: `sap_service.py`, `sap_router.py`

**質問:**
1. SAP登録のトリガー
2. SAP登録失敗時の対応
3. SAP側との責任分界点

### 9-2. 🟠 高優先（運用ルール）

#### 在庫ロック機能の用途

**ファイル**: `lot_models.py` (locked_quantity), `LockMode`

#### 調整理由の分類

**ファイル**: `adjustment_service.py`, `AdjustmentType`

### 9-3. 🟡 中優先（拡張性・将来対応）

#### マルチ倉庫対応の方針

**ファイル**: `config.py` (DEFAULT_WAREHOUSE_ID)

#### 予測需要（Forecast）の活用方法

**ファイル**: `lot_reservations_model.py` (ReservationSourceType.FORECAST)

**元:** `BUSINESS_CONTEXT_NEEDED.md` (2025-12-27)

---

## 10. Excelビュー機能 (材料ロット管理/個別)

### 10-4. 日付列の仕様整理（予測 vs 実績）

**優先度**: High
**状態**: 要件確認

**内容**:
- 予測（フォーキャスト）と実績（出荷確定）の扱い方針を決定
- 日付が過ぎた列の扱い（自動確定/手動確定）の整理

---

### 10-6. 納入先5件以下の罫線バグ

**優先度**: Medium
**状態**: 未対応

**内容**:
- ShipmentTable / DateGrid の縦線が揃わない
- 境界線の重複を整理し、縦線の揃いを改善
  - 目視確認の結果、現状も解消せず。時間対効果を考慮しバックログに残す

---

## 参考情報

### 統合元ファイル

本バックログは以下のファイルを統合したものです:

1. `docs/project/plans/backlog/TODO.md` (2026-01-10)
2. `docs/project/plans/backlog/backlog.md` (2026-01-18)
3. `docs/project/plans/backlog/BUSINESS_CONTEXT_NEEDED.md` (2025-12-27)
4. `docs/project/plans/backlog/FUTURE_IMPROVEMENTS.md` (日付なし)
5. `docs/project/plans/backlog/MASTER_DATA_FIELD_ALIGNMENT_TASKS.md` (2026-01-19)
6. `docs/project/plans/backlog/any-type-reduction.md` (2026-01-18)
7. `docs/project/plans/backlog/next_reviews_ja.md` (日付なし)
8. `docs/project/plans/backlog/smartread-cache-db-save-inconsistency.md` (2026-01-21)
9. `docs/project/plans/backlog/smartread-logging-gaps.md` (2026-01-21)

統合後のバックログファイルは `docs/project/BACKLOG.md` に配置されています。
元のファイルは `docs/archive/backlog/` に保管されています。

---

### 更新履歴

- 2026-01-24: 9ファイルを統合し、単一バックログとして整理
- 2026-01-26: クイックウィン4件対応 (1-4, 2-2, 2-4, 8-9)
- 2026-01-26: Excelビュー機能タスク追加 (セクション10)、仕入先表示・forecast_period表示修正完了
- 2026-02-01: ロットアーカイブ時の 401 Unauthorized エラーの修正、認証ロジックの統合を完了
- 2026-02-02: E2Eテスト並列実行の安定化完了タスクをARCHIVE.mdに移動、認証・認可システム再設計提案を追加

---

## 11. 未完了プロジェクト・設計ドキュメントに基づくタスク (優先度: 低 - 後回し)

本セクションのタスクは、詳細な設計ドキュメントが存在しますが、現在は「後回し」として扱います。

### 11-1. 通知システム表示戦略の高度化 (Phase 1)
- **内容**: `display_strategy` (immediate/deferred/persistent) によるトースト表示の出し分け。
- **優先度**: 低 (後回し)
- **関連ドキュメント**: [PHASE1-4_IMPLEMENTATION_PLAN.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/project/PHASE1-4_IMPLEMENTATION_PLAN.md)

### 11-2. 受注管理ナビゲーションとOCR取込の統合 (Phase 2)
- **内容**: 受注管理ページへのOCR取込UI統合、3層ナビゲーションの完全適用。
- **優先度**: 低 (後回し)
- **関連ドキュメント**: [PHASE1-4_IMPLEMENTATION_PLAN.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/project/PHASE1-4_IMPLEMENTATION_PLAN.md)

### 11-3. システム管理メニューの完全分割 (Phase 3)
- **内容**: ユーザー管理、ログビューア、通知設定の完全な独立メニュー化とUI整理。
- **優先度**: 低 (後回し)
- **関連ドキュメント**: [PHASE1-4_IMPLEMENTATION_PLAN.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/project/PHASE1-4_IMPLEMENTATION_PLAN.md)

### 11-4. Excel View 付随機能の導入 (Phase 9)
- **内容**: ページレベルメモUI、セル別コメント編集ダイアログ、手動出荷日設定機能の実装。
- **優先度**: 低 (後回し)
- **関連ドキュメント**: [PHASE9_NEXT_SESSION.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/project/PHASE9_NEXT_SESSION.md)

### 11-5. 倉庫の自動特定機能 (Excel View 関連拡張)
- **内容**: 「先方品番×メーカー品番×仕入先」による倉庫の自動特定ロジックの実装。
- **優先度**: 低 (後回し)
- **関連ドキュメント**: [PHASE9_NEXT_SESSION.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/project/PHASE9_NEXT_SESSION.md)

### 11-6. 担当仕入先フィルタ (`SupplierFilterSet`) の水平展開
- **内容**: 在庫一覧、受注一覧、入荷予定一覧など、全ページへの共通フィルタコンポーネントの適用。
- **優先度**: 低 (後回し)
- **関連ドキュメント**: [supplier-filter-set-implementation-plan.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/project/supplier-filter-set-implementation-plan.md)

---

---

## 4. 優先度: 低（将来対応・技術的負債）

### 4-X. 楽観的ロックの残りテーブル対応

**優先度:** 低（実際に競合が発生してから対応）
**作成:** 2026-02-05
**カテゴリ:** 排他制御・データ整合性
**工数:** 1-2日

**背景:**
Phase 4で SmartRead/OCR系と主要マスタ系に楽観的ロック (`version` カラム) を導入済み。残りの低頻度更新テーブルは、実際に競合が発生した際に追加対応する。

**実装済み (18テーブル):**
- SmartRead/OCR系: `smartread_tasks`, `smartread_wide_data`, `smartread_long_data`, `ocr_result_edits`
- マスタ系: `warehouses`, `suppliers`, `customers`, `delivery_places`, `makers`, `supplier_items`, `customer_items`, `product_mappings`, `product_uom_conversions`, `customer_item_jiku_mappings`, `customer_item_delivery_settings`, `warehouse_delivery_routes`, `shipping_master_raw`, `shipping_master_curated`
- 割当系: `user_supplier_assignments`

**未対応テーブルの選定基準:**
以下の条件を**すべて満たす**テーブルを対象に、実際に競合が発生したら `version` を追加:

1. **更新頻度:** 低頻度（週1回未満）だが、将来的に複数ユーザーが編集する可能性がある
2. **データ重要度:** 上書きされると業務に影響がある
3. **現状の制御:** 楽観ロックも悲観ロックもない

**未対応テーブル候補（優先順位順）:**

#### Phase 3候補 (管理画面の同時編集対策)
以下は管理画面で編集されるが、現状は単一管理者のみのため優先度低:
- `product_warehouse` - 製品倉庫マッピング
- `layer_code_mappings` - 層別コードマッピング（makersに統合予定？）
- `users`, `roles`, `user_roles` - ユーザー・権限管理
- `system_configs` - システム設定
- `holiday_calendars`, `company_calendars`, `original_delivery_calendars` - カレンダー設定
- `missing_mapping_events` - マッピング欠損イベント
- `sap_connections` - SAP接続設定
- `business_rules` - ビジネスルール

#### Phase 4候補 (予測/入荷系)
バッチ処理が主だが、手動編集もあり得る:
- `inbound_plans`, `inbound_plan_lines` - 入荷予定
- `expected_lots` - 予定ロット

#### Phase 5候補 (引当系 - 検討)
現在は悲観ロック (`FOR UPDATE`) で保護されているため、楽観ロックは不要の可能性:
- `withdrawals`, `withdrawal_lines` - 出庫

#### 対象外（追記のみ、またはバッチ専用）
以下は楽観ロック不要:
- 追記のみ: `stock_history`, `allocation_traces`, `lot_reservation_history`, `forecast_history`, `rpa_run_events`, `rpa_run_item_attempts`, `rpa_run_fetches`, `sap_fetch_logs`, `system_client_logs`, `operation_logs`, `master_change_logs`, `server_logs`, `seed_snapshots`
- バッチ専用: `forecast_current`, `material_order_forecasts`, `sap_material_cache`, `allocation_suggestions`
- 低頻度: `notifications` (既読更新のみ)

**実装時の作業:**
1. マイグレーションで `version` カラム追加
2. モデルに `version` フィールド追加
3. 更新/削除APIで `optimistic_lock.py` ヘルパー使用
4. フロントエンドで `version` を保持・送信
5. 409エラーハンドリング追加

**関連ドキュメント:**
- `docs/project/CONCURRENCY_CONTROL_AUDIT.md` - 全テーブル調査結果
- `backend/app/application/services/common/optimistic_lock.py` - ヘルパー関数

**元:** Phase 4実装完了後の残課題 (2026-02-05)

---

## 3. 優先度: 低 (Maintenance/Major Updates)

### 3-0. 厳密化・堅牢性の後続タスク

**優先度:** 低
**作成:** 2026-02-07
**カテゴリ:** コード品質・堅牢性
**状態:** ほぼ完了（残: asyncpg移行 + 型定義見直し）

**完了済み:**
- [x] **eslint-plugin-import → eslint-plugin-import-x 移行** - ESM対応・パフォーマンス改善
- [x] **ESLint `no-explicit-any` の段階的有効化** - off → warn に変更、段階的移行用の緩和設定追加
- [x] **Vite manual chunks 最適化** - vendor-react/ui/utils/charts に分割
- [x] **`exactOptionalPropertyTypes: true`** - tsconfig.json に追加、関連コード修正済み
- [x] **`noUncheckedIndexedAccess: true`** - tsconfig.json に追加、関連コード修正済み
- [x] **requests → httpx 統一** - SmartReadサービスをhttpxに移行、`requests` を本番依存から削除
- [x] **TSC 0 errors** - 467件のTS型エラーを全て解消
- [x] **ESLint 0 errors / 0 warnings** - 53件のESLintエラー・警告を全て解消

**残タスク:**
1. **asyncpg移行** - psycopg2-binary → asyncpg（非同期DB接続）- 高難易度
2. **型定義側の `| undefined` 対応** → BACKLOG 3-4 参照

### 3-4. exactOptionalPropertyTypes 根本対応（型定義見直し + eslint-disable削減）

**優先度:** 低
**作成:** 2026-02-08
**カテゴリ:** コード品質・型安全性
**状態:** 未着手

**背景:**
`exactOptionalPropertyTypes: true` 有効化に伴い、call site 側で防御的 Spread パターン（`...(x != null ? { prop: x } : {})`）が302箇所 / 111ファイルに増加。根本原因は型定義側にある。

**現状の問題:**

| 問題 | 深刻度 | 規模 |
|------|--------|------|
| Spread条件構文が3パターン混在 | 中 | 394箇所（`? : {}` 77%, `&& {}` 15%, `!= null` 8%） |
| factory関数の過度な複雑化 | 高 | `order-factory.ts` に3段nullish coalescing |
| 型定義側に `\| undefined` なし | 中 | `api.d.ts` + `aliases.ts` が根本原因 |
| 冗長なSpreadパターン | 低 | 302箇所 / 111ファイル |

**eslint-disable コメント現況:** 141行 / 116ファイル
- `max-lines-per-function`: 111箇所（構造的・共通化で段階的解消）
- `complexity`: 52箇所（同上）
- `no-explicit-any`: 8箇所（型改善で解消可能）
- `max-lines`: 8箇所（ファイル分割で解消可能）

**対応計画（優先度順）:**
1. **openapi-typescript 生成後の後処理スクリプト** - `prop?: T | null` → `prop?: T | null | undefined` を自動追加
2. **`aliases.ts` の手動型に `| undefined` 追加** - 根本修正
3. **Spread条件パターン統一** - 根本修正後に `!= null ? { k: v } : {}` に統一（母数が大幅減少）
4. **`order-factory.ts` 整理** - ヘルパー関数抽出（テスト用なので優先度低）
5. **eslint-disable 段階的解消** - 共通化による分割で `max-lines-per-function` / `complexity` を減らす

**注記:** 共通化タスクと並行で進めるのが効率的

### 3-1. Major Dependency Updates (2026-02-07)

**優先度:** 低
**作成:** 2026-02-07
**カテゴリ:** メンテナンス

**対象パッケージ:**
1. **Frontend:**
   - `eslint`: 9.39.2 -> 10.0.0 (Major update, check for config changes)
   - `jsdom`: 27.4.0 -> 28.0.0 (Major update)
2. **Backend:**
   - `ruff`: <0.15.0 -> 0.15.0+ (Major/Breaking checks required)

**タスク内容:**
- 各パッケージのCHANGELOGを確認
- アップデート実施と破壊的変更の修正
- 設定ファイル (`eslint.config.js`, `pyproject.toml`) の更新

### 3-2. ヘルプページ: Markdown直レンダリング（設計済み）

**優先度:** 低  
**作成:** 2026-02-07  
**カテゴリ:** UI/ドキュメント運用  
**状態:** 設計完了 / 実装待ち

**目的:**
- 画面ごとのヘルプを Markdown から直接表示し、仕様書の二重管理を防ぐ。

**設計ドキュメント:**
- `docs/project/plans/help-markdown-rendering-design.md`
