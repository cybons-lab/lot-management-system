# タスクバックログ (統合版)

**最終更新:** 2026-02-01

---

## 概要

本ファイルは、未完了のタスク・調査事項・将来改善項目を集約したバックログです。完了済みのタスクは別途残さず、本バックログに最新の状態のみを記載します。

---

## 1. 優先度: 高 (即時対応)

### 1-1. E2Eテスト残存問題・不安定性

**現状:** P0テストの信頼性が向上（`e2e-04` socket hang up解消、`reset-database`復元）。直列実行(`--workers=1`)では安定してパスするが、並列実行時にDBリセット起因のエラーが多発する。

**残存問題（2件）:**

1. ~~**DBリセットの並列実行競合 (Critical)**~~ ✅ **対応済み (2026-02-01)**
   - 症状: `reset-database` エンドポイントが `500 OperationalError (LockNotAvailable)` で失敗する。
   - 原因: アドバイザリロックの残留により、後続のリセット処理がロック取得待ちでタイムアウト。
   - **対応内容**:
     - アドバイザリロック (`pg_advisory_lock`) を廃止し、TRUNCATE自体のロックに依存する方式に変更。
     - TRUNCATE は自動的に ACCESS EXCLUSIVE LOCK を取得するため、複数呼び出しは自然に直列化される。
     - E2Eテストのエラーハンドリングを改善: エラーを握りつぶさず、失敗時に即座に例外をスロー。
   - **残存課題**:
     - システム設定画面でログレベルを変更しても、実行中のバックエンドには反映されない（要再起動）。
     - E2Eテストの `api-client.ts` で一部のエラーを握りつぶしている箇所が残っている可能性（要精査）。

2. **UI要素の検出遅延・不一致**
   - テスト: `e2e-02-save-persistence.spec.ts`
   - 症状: マスタ編集ダイアログで「更新」ボタンが見つからずタイムアウトする。
   - 原因: ボタン名のRegex不一致（`保存|更新` vs `作成|登録`）や、ダイアログ表示タイミング。
   - 対応: セレクタは修正済み(`保存|更新|作成|登録`)。引き続き安定性を監視。

3. **ログイン401エラー（散発的）**
   - 症状: テストデータ生成APIのタイムアウトや失敗により、ユーザーが存在せずログインに失敗する。
   - 原因: `reset-database` 直後のデータ投入(`test-data/generate`)が重い、または競合している。

**解決済み（2026-02-01）:**
- ✅ **socket hang up (`e2e-04`)**:
  - 原因: Playwrightのコネクション問題と、API設計（`/admin`配下の混同）。
  - 対応: エンドポイントを`/api/dashboard/stats`に分離し、テストを直列実行(`test.describe.configure({ mode: 'serial' })`)に設定。
- ✅ **reset-database 500エラー**:
  - 原因: リファクタリング時の実装漏れと、セッション管理の問題。
  - 対応: エンドポイント復元と実装修正（依存関係削除）。

**参考:**
- ブランチ: `fix/e2e-permission-socket-hangup`
- 最新検証: workers=1 で `e2e-01`, `e2e-04` pass確認済み

---

### 1-2. 入庫履歴が表示されない問題（調査済み）

**症状:** 入庫履歴タブで「入庫履歴はありません」と表示される。
**原因:** `lot_service.create_lot()` で `StockHistory` の INBOUND レコードが作成されていない。
**影響:** 画面からのロット新規登録・API経由のロット作成で入庫履歴が欠落する。

**推奨対応:**
1. `lot_service.create_lot()` に INBOUND の `StockHistory` 生成を追加
2. 既存データ用のマイグレーションを用意
3. 入庫履歴画面で再確認

**関連ファイル:**
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/inventory/intake_history_service.py`

**元:** `TODO.md` (2026-01-10) & `backlog.md::1-1` (2026-01-18)

---

### 1-2. 未実装 API エンドポイント

以下のPOSTエンドポイントはテストコード（`tests/error_scenarios/`）に記載がありますが、まだ実装されていません。

**優先度: 中**

| エンドポイント | 説明 | 関連テスト |
|---------------|------|-----------|
| `POST /api/roles/` | ロール作成API | `test_constraints.py::test_duplicate_role_code` |
| `POST /api/orders/` | 受注作成API | `test_validation_errors.py::test_create_order_validation_error` |
| `POST /api/inbound-plans/` | 入荷計画作成API | `test_validation_errors.py::test_create_inbound_plan_validation_error` |
| `POST /api/adjustments/` | 在庫調整作成API | `test_validation_errors.py::test_create_adjustment_validation_error` |

> **Note**: これらのテストは現在 `@pytest.mark.skip` でスキップされています。
> 実装完了後、スキップマーカーを削除してテストを有効化してください。

**元:** `TODO.md` (2026-01-10)

---

### ~~1-3. CI/CDでtypecheckが無効化されていた~~ ✅ 対応済み

**優先度**: 高
**作成**: 2026-01-31
**完了**: 2026-01-31
**カテゴリ**: CI/CD・品質保証

**問題:**
- Typecheckが `.github/workflows/ci.yml` でコメントアウトされていた
- 理由: "type definitions sync issue" (実際には問題なし)

**対応内容:**
- ✅ Typecheckを有効化（L34-36のコメント解除）
- ✅ ローカルでtypecheck実行 → エラーなし確認
- ✅ E2Eテストは既に別ジョブ (`e2e-smoke`, L103-199) として実装済み

**確認結果:**
```yaml
CI構成:
  Job 1: Frontend Tests
    ✅ Lint (ESLint)
    ✅ Typecheck (有効化)
    ✅ Unit Tests (Vitest)

  Job 2: Backend Tests
    ✅ Lint (ruff)
    ✅ Tests (pytest)

  Job 3: E2E Smoke Tests (needs: frontend + backend)
    ✅ Playwright smoke tests (P0 critical paths)
```

**関連ファイル:**
- `.github/workflows/ci.yml` (L34-36: typecheck有効化)

---

### 1-4. 在庫計算ロジックの厳密化とSSOT固定

**優先度**: High
**難易度**: Medium
**想定工数**: 2-3日

**背景・課題:**
- ドメイン定義（仮予約Activeは在庫を減らさない）と、現在のビュー/サービス計算に一部乖離や二重控除のリスクが指摘されている。
- 「利用可能在庫」の真の情報源（SSOT）を1箇所に固定し、不整合を排除する必要がある。

**タスク内容:**
1. `allocated_quantity` の定義を `confirmed_only` に統一し、Activeは `reserved_quantity_active` 等で分離表示する。
2. ロック数量の二重控除（ビューで減算済みかつ計算ロジックでも減算）のリスクを解消。
3. UI上の説明（ツールチップ等）と実計算式を完全に一致させる。

**元:** `FUTURE_IMPROVEMENTS.md`

---

<<<<<<< HEAD
### ~~1-4. エラー処理・ログ出力の改善（2026-01-29 レビュー）~~ ✅ 対応済み
=======
### ~~1-5. エラー処理・ログ出力の改善（2026-01-29 レビュー）~~ ✅ 対応済み
>>>>>>> origin/main

**優先度**: High
**作成**: 2026-01-29
**完了**: 2026-01-30
**カテゴリ**: 可観測性・デバッグ性

**背景:**
エラー処理とログ出力のコードレビューにより、重大な問題が発見された。
特にロット管理システムの核心部分（FEFO引当、Repository）にログがなく、障害時の原因追跡が困難だった。

#### ✅ 重大な問題（対応完了）

**1. ✅ Repositoryレイヤーにログを追加**
- `lot_repository.py`, `allocation_repository.py` にログ追加
- コミット: `74876ec`

**2. ✅ FEFOアロケーションにログを追加**
- `fefo.py`, `auto.py`, `commit.py`, `confirm.py`, `cancel.py` にログ追加
- コミット: `74876ec`

**3. ✅ トランザクション境界のログを追加**
- `uow_service.py` にcommit/rollbackログを追加
- コミット: `74876ec`

**4. ✅ MaintenanceMiddlewareのサイレント例外を修正**
- 例外時にwarningログを出力、ロジックバグも修正
- コミット: `74876ec`

#### ✅ 中程度の問題（対応完了）

**5. ✅ フロントエンドのサイレントエラーを修正**
- `AuthContext.tsx` にセッション復元失敗時のtoast通知を追加
- 注: `ExportButton.tsx`, `MasterPageActions.tsx`, `useDatabaseReset.ts` は既にtoast通知実装済み
- コミット: `38da2e0`

**6. ✅ 機密データのログ出力リスクを修正**
- `main.py` に `_mask_database_url()` を追加、DATABASE_URLをマスク
- コミット: `38da2e0`

**7. ✅ ログ量の不均衡を改善**
- FEFO/Allocationにログを追加（項目2で対応）
- コミット: `74876ec`

**8. ✅ 例外ハンドリングパターンのドキュメント作成**
- `docs/development/standards/error-handling.md` を作成
- コミット: `38da2e0`

#### ✅ 良い点（参考）

- RFC 7807 Problem+JSON 準拠のエラーレスポンス
- 構造化されたドメイン例外階層
- グローバル例外ハンドラで一貫したHTTPステータスマッピング
- UnitOfWorkパターンでトランザクションの原子性確保
- structlogによる構造化ログ設定
- フロントエンドのkyクライアント集中エラー処理

**元:** 2026-01-29 エラー処理・ログ出力レビュー

---

## 2. 優先度: 中 (UI/UX・不整合修正)

### 2-1. InboundPlansList のテーブルソート機能が動かない

- `sortable: true` なのに `DataTable` へ `sort` / `onSortChange` を渡していない。
- 対象: `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

**元:** `backlog.md::2-1` (2026-01-18)

---

### 2-2. フィルターリセットボタンの欠如

- `AdjustmentsListPage`, `WithdrawalsListPage` にリセット操作がない。
- 対象:
  - `frontend/src/features/adjustments/pages/AdjustmentsListPage.tsx`
  - `frontend/src/features/withdrawals/pages/WithdrawalsListPage.tsx`

**元:** `backlog.md::2-3` (2026-01-18)

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

### 2-8. ライブラリのメジャーアップデート対応

**優先度**: 中
**作成**: 2026-01-31
**カテゴリ**: メンテナンス・技術債

**背景:**
2026-01-31の定期アップデート確認において、以下のライブラリでメジャーバージョンの更新が確認された。これらは破壊的変更を含む可能性があるため、個別にテストと検証を行いつつ適用する必要がある。

**検討中のアップデート:**
- `pandas`: 2.3.3 -> 3.0.0
- `websockets`: 15.0.1 -> 16.0
- `pycparser`: 2.23 -> 3.0

**タスク内容:**
1. 各ライブラリのリリースノート（破壊的変更）の確認。
2. 開発環境でのアップグレード適用。
3. 既存機能（特にデータ分析、WebSocket通信）の回帰テスト実施。
4. 問題なければ本番環境へ適用。

---
**元:** `backlog.md::8-2` (2026-01-18) & `next_reviews_ja.md` (日付なし)

---

### 2-8. フロントエンド・コンソールエラー

**症状**: React Key重複エラー（"Encountered two children with the same key"）などがコンソールに出力されている。
**タスク**: リストレンダリング時のkey生成ロジック修正。

**元:** `backlog.md::8-3` (2026-01-18)

---

### 2-9. 在庫詳細の仕入先固定

**要望**: 在庫詳細画面において、仕入先が固定（または明確化）されるべき。
**タスク**: 製品×倉庫のコンテキストにおける仕入先特定ロジックの実装とUI反映。

**元:** `backlog.md::8-4` (2026-01-18)

---

### 2-10. ログレベルの動的変更機能

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

### 2-11. E2Eテストのエラーハンドリング改善

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

### 2-12. SmartRead OCR処理完了通知機能

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

### 2-11. SmartRead: ファイルアップロードとフォルダ監視の処理統一

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

### 2-12. フロントエンド: Chart Event Handlersに適切な型を定義

**優先度**: Medium (any型削減 Phase 1)
**対象**: 4箇所

**場所**:
- `features/dashboard/components/WarehouseDistributionChart.tsx`
- `features/dashboard/components/TopProductsChart.tsx`

**現状:**
```typescript
const handlePieClick = (data: any) => {
  if (data && data.id) {
    navigate(`/inventory?warehouse_id=${data.id}`);
  }
}
```

**対応:**
```typescript
interface PieClickData {
  id?: number;
  payload?: {
    id?: number;
  };
}

const handlePieClick = (data: PieClickData) => {
  const warehouseId = data?.id ?? data?.payload?.id;
  if (warehouseId) {
    navigate(`/inventory?warehouse_id=${warehouseId}`);
  }
}
```

**元:** `any-type-reduction.md` (2026-01-18)

---

### 2-11. データ再読み込みボタンの共通化

**優先度**: Medium
**難易度**: Low
**想定工数**: 0.5-1日

**背景:**
現在、OCR結果ページには手動でデータを再読み込みするボタンが実装されています（2026-01-23実装）。しかし、他のデータ一覧ページ（出荷用マスタ、在庫一覧、受注一覧など）には同様の機能がありません。

ユーザーがF5キーでページ全体をリロードすると、以下の問題が発生します：
- ログイン状態が失われる可能性
- フォーム入力内容が消える
- アプリケーション全体の再初期化が発生（不要なリソース消費）

**提案:** 共通コンポーネント `RefreshButton` を作成し、全主要ページに配置。

**対象ページ:**
1. ✅ OCR結果ページ (`OcrResultsListPage.tsx`)
2. ❌ 出荷用マスタページ (`ShippingMasterListPage.tsx`)
3. ❌ 在庫一覧ページ (`InventoryListPage.tsx`)
4. ❌ 受注一覧ページ (`OrdersListPage.tsx`)
5. ❌ ロット一覧ページ (`LotsListPage.tsx`)
6. ❌ 仕入先マスタページ (`SuppliersListPage.tsx`)
7. ❌ 得意先マスタページ (`CustomersListPage.tsx`)
8. ❌ SAP統合ページ (`DataFetchTab.tsx`)
9. ❌ フォーキャストページ (`ForecastPage.tsx`)

**元:** `FUTURE_IMPROVEMENTS.md`

---

### 2-12. 在庫一覧ページネーションの「総件数」対応

**現状**: APIが総件数（total count）を返さないため、フロントエンドでは「現在のページ番号」と「現在の表示件数」のみを表示しています（例: 「ページ 1 (表示件数: 20)」）。

**課題**: ユーザーにとって全体のボリュームが把握しづらい状態です。

**タスク:**
- バックエンドAPI (`/api/v2/inventory/`) が総件数を返すように修正できるか調査する。
- 修正可能な場合、APIレスポンスに `total` フィールドを追加し、フロントエンドのページネーションコンポーネントで総ページ数を計算・表示できるようにする。

**元:** `next_reviews_ja.md::1`

---

### 2-13. 在庫管理トップのフィルタ仕様の調査・改善

**現状**: フィルタの挙動が直感的でないとの指摘があります。
- 「製品」を選択した後に「仕入先」を変更すると、リストからデータが消える（AND検索がきつすぎる、または連動していない等）。
- 倉庫フィルタが他と連動していない。

**タスク:**
- 現在のフィルタ実装（`useInventoryPageState` や `useFilterOptions`）の依存関係と絞り込みロジックを整理する。
- ユーザーが期待する挙動（例: 選択可能な選択肢のみを表示する動的フィルタリング、あるいはOR検索の導入など）を明確にし、実装案を策定する。

**元:** `next_reviews_ja.md::3`

---

### 2-14. テストデータの拡充（SAP仕入先・数量単位）

**優先度**: Medium
**作成**: 2026-02-01
**カテゴリ**: テストデータ品質

**背景:**
OCR結果テーブルにおいて、以下のフィールドのテストデータが不足している：
1. **SAP仕入先** (`sap_supplier_code`, `sap_supplier_name`)
2. **数量単位** (`sap_qty_unit`)

これらのフィールドが常に空表示となっており、UI表示の検証が困難。

**タスク内容:**
1. テストデータ生成スクリプト（`generate_sample_data.py` 等）を更新
2. 以下のデータを追加:
   - SAP仕入先情報（SAP関連ページのテストデータ）
   - 数量単位情報（出荷用マスタデータページのテストデータ）
3. OCR結果のサンプルデータに上記フィールドを含める

**関連ファイル:**
- `backend/app/application/services/test_data_generator.py` (または類似のテストデータ生成スクリプト)
- `backend/app/infrastructure/persistence/models/ocr_models.py`

**元:** ユーザー要望 (2026-02-01)

---

## 3. DB/UI整合性・データ表示改善

### 3-1. Lots のステータス系フィールドがUI未表示

- `status`, `inspection_status`, `inspection_date`, `inspection_cert_number`, `origin_reference`
- 対象: 在庫一覧・ロット詳細の表示コンポーネント

**元:** `backlog.md::3-1` (2026-01-18)

---

### 3-2. Orders の一部フィールドがUI未表示

- `ocr_source_filename`, `cancel_reason`, `external_product_code`, `shipping_document_text`
- 対象: 受注詳細画面

**元:** `backlog.md::3-2` (2026-01-18)

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

### 4-1. useQuery のエラー処理追加（Phase 2）

- `AllocationDialog.tsx`, `ForecastsTab.tsx`, `InboundPlansTab.tsx`, `WithdrawalCalendar.tsx` など。

**元:** `backlog.md::4-1` (2026-01-18)

---

### 4-2. 日付ユーティリティの統合

- `shared/utils/date.ts`, `shared/libs/utils/date.ts`, `features/forecasts/.../date-utils.ts` の重複整理。

**元:** `backlog.md::4-2` (2026-01-18)

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

### 4-5. フロントエンド: Zod Resolverの型問題を解決

**優先度**: Medium (any型削減 Phase 2)
**対象**: 6箇所

**場所**:
- `features/warehouses/components/WarehouseForm.tsx`
- `features/rpa/smartread/components/SmartReadSettingsModal.tsx`
- `features/uom-conversions/components/UomConversionForm.tsx`
- `features/warehouse-delivery-routes/components/WarehouseDeliveryRouteForm.tsx`
- `features/product-mappings/components/ProductMappingForm.tsx`
- `features/delivery-places/components/DeliveryPlaceForm.tsx`

**現状:**
```typescript
resolver: zodResolver(warehouseFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
```

**対応:**
```typescript
// Before
resolver: zodResolver(schema) as any,

// After
resolver: zodResolver(schema) as Resolver<WarehouseFormData>,
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

### 5-1. 統合テスト・E2Eテストの拡充

**優先度**: High
**作成**: 2026-01-30
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
- [ ] E2Eテストフレームワークの選定・導入（Playwright推奨）
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
- [x] 独自test_dbセッションの削除（21ファイル）→ グローバル `db` fixture に統一
- [ ] 重複fixture の共通化（supplier, warehouse, customer など）
- [ ] トランザクション管理の統一（conftest.pyのパターンに従う）

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

### 9-12. 空の Schema クラス (pass only) の整理

**優先度**: Low
**作成**: 2026-01-26

**背景:**
`pass` のみの空クラスが29箇所存在。
目的が不明確で、コードの意図が伝わりにくい。

**対象 (一部):**
- `forecast_schema.py:30`
- `orders_schema.py:145`
- `masters_schema.py:40,96,150,206,250,340`
- `customer_items_schema.py:47`
- その他20+箇所

**対応:**
1. 継承のみが目的なら、docstringでその旨を明記
2. 不要なクラスは削除
3. フィールドを追加すべきなら追加

---

### 9-13. セキュリティ: db_browser_router の権限チェック

**優先度**: High
**作成**: 2026-01-26

**背景:**
`/api/debug/db-browser` エンドポイントが認可チェックなしでアクセス可能。
本番環境で有効化されると重大なセキュリティリスク。

**対象:**
- `backend/app/presentation/api/routes/debug/db_browser_router.py`

**対応:**
1. `settings.ENVIRONMENT == "development"` チェックを追加
2. または管理者ロール（`is_admin`）のみアクセス可能に
3. 本番デプロイ時にはルーター自体を無効化

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
- `lots_router.py:461` - "Add permission check"（権限チェック未実装）
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

### 10-1. 成績書（COA）の納入先別管理

**優先度**: Medium
**作成**: 2026-01-26
**状態**: 設計検討中

**背景:**
実際のExcel運用では、**検査成績書は納入先ごとに発行日が異なる**。
例：同じロットでも DN北海道 → 2025/10/24、DN岩手 → 2025/10/24（同日の場合もある）

**現状の問題:**
- `LotReceipt.inspection_date` はロット単位の情報
- 実運用では納入先×ロットの組み合わせで成績書を管理

**対応案:**
1. `AllocationSuggestion` に `coa_issue_date` カラムを追加
2. または出荷レコードに成績書発行日を持たせる
3. フロントエンドで納入先行ごとに日付を表示

**関連ファイル:**
- `backend/app/infrastructure/persistence/models/inventory_models.py` (AllocationSuggestion)
- `frontend/src/features/inventory/components/excel-view/subcomponents/ShipmentTable.tsx`

---

### 10-2. 収容数・保証期間フィールドの実装

**優先度**: Low
**作成**: 2026-01-26

**背景:**
Excelビューヘッダーに「収容数」「保証期間」列があるが、バックエンドに対応フィールドがない。

**UIでの表示状態:**
- 収容数: 常に `-` 表示
- 保証期間: 常に `-` 表示

**対応案:**
1. `Product` テーブルに以下のカラムを追加:
   - `capacity` (収容数): パッケージあたりの収容量
   - `warranty_period_days` (保証期間日数): 製品の保証期間
2. InventoryItem API レスポンスにこれらのフィールドを含める

**関連ファイル:**
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts:177-178`
- `backend/app/presentation/schemas/inventory/inventory_schema.py`

---

### 10-3. 先方品番（customerPartNo）の表示

**優先度**: Medium
**作成**: 2026-01-26

**背景:**
Excelビューの得意先情報に「先方品番」を表示する欄があるが、現在は常に `-` 表示。
先方品番マスタ（`customer_items`）には顧客-製品のマッピングが存在する。

**対応案:**
1. `AllocationSuggestion` レスポンスに `customer_part_no` を含める
2. または、フロントエンドで `customer_id` + `product_id` から `customer_items` をルックアップ
3. `useExcelViewData.ts` の `getDestinationInfo()` でAPIから取得した値を使用

**関連ファイル:**
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts:56`
- `backend/app/presentation/api/v2/forecast/router.py` (AllocationSuggestion API)

---

### 10-4. 発注NO.の表示

**優先度**: Low
**作成**: 2026-01-26

**背景:**
Excelビューのロット情報に「発注NO.」列があるが、常に `-` 表示。
ロットが発注（Purchase Order）に紐づいている場合、その発注番号を表示すべき。

**現状:**
- `LotReceipt.origin_reference` に参照情報があるが、発注番号とは別概念
- 発注管理機能自体が未実装の可能性

**対応案:**
1. 発注管理機能の実装状況を確認
2. `LotReceipt` に `purchase_order_id` / `purchase_order_number` を追加
3. またはビジネス要件を再確認（発注NOが必要かどうか）

**関連ファイル:**
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts:84`

---

### 10-5. ✅ 仕入先情報の表示修正（対応済み）

**解決日**: 2026-01-26

**問題:**
Excelビューのヘッダーで「仕入先」「仕入先名称」が `-` 表示だった。

**原因:**
`GET /api/v2/inventory/{product_id}/{warehouse_id}` が `supplier_id`, `supplier_code`, `supplier_name` を返していなかった。

**対応:**
`inventory_service.py` の `get_inventory_item_by_product_warehouse()` にサプライヤー取得クエリを追加し、レスポンスに含めるように修正。

---

### 10-6. ✅ forecast_period 日付表示の修正（対応済み）

**解決日**: 2026-01-26

**問題:**
`forecast_period` は `YYYY-MM` 形式（月単位）だが、フロントエンドは `parseISO()` で日付としてパースしようとしていた。

**対応:**
`DateGrid.tsx` に `formatPeriodHeader()` 関数を追加:
- `YYYY-MM` 形式 → `1月`, `2月` のように月表示
- `YYYY-MM-DD` 形式 → `01/15` のように日付表示

---

### 10-7. 日付列の仕様整理（予測 vs 実績）

**優先度**: High
**作成**: 2026-01-26
**状態**: 設計検討中

**背景:**
実際の運用では、日付列は**予測（フォーキャスト）と実績の両方**を扱う：
- 未来日付 = 仮引当/予定（現在の `AllocationSuggestion` で対応）
- 過去日付 = 確定/実績（出荷済みデータ）
- 日付が過ぎたら自動的に確定扱い

**確認事項:**
1. 日付が過ぎた行をどのように扱うか（自動確定？手動確定？）
2. 実績データのソース（出荷履歴？引当確定？）
3. 予測と実績の表示上の区別（色分け等）

---

### 10-8. 同一ロット・入荷日別の行表示

**優先度**: Medium
**作成**: 2026-01-26
**状態**: 設計確認済み ✅

**背景:**
実運用では**同じロット番号でも入荷日が違えば別行として扱う**。
例：ロット `CE880104` → 入荷日 `2025/11/12` と `2025/11/19` は別行

**確認結果（2026-01-26）:**
- `LotReceipt` のユニーク制約は `receipt_key`（UUID）のみ
- `lot_number` にはユニーク制約がない
- **同じロット番号で異なる `received_date` の複数レコード作成が可能** ✅

**残タスク:**
1. 「既存ロットに追加入庫」UIの用途を再検討（ほぼ使わないとのこと）
2. Excelビューで同一ロット番号・別入荷日を正しく表示できるか確認

**関連ファイル:**
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py`
- `backend/app/infrastructure/persistence/models/lot_master_model.py`

---

## 11. 対応済み

### 11-1. テストデータ生成の問題 (inventory_scenarios)

**解決日**: 2026-01-18
**マイグレーション**: `b77dcffc2d98`

ビュー定義を修正し、消費（consumed）が現在在庫に即座に反映されるようになりました。

**元:** `TODO.md::対応済み` (2026-01-10)

---

### 11-2. Date Handling の型を明示 (orchestrator.py)

**解決日**: 2026-01-26

`execute_step2` の `start_date` / `end_date` パラメータを `Any` から `date | None` に変更。

**元:** `any-type-reduction.md` (1-4)

---

### 11-3. InboundPlansList のステータス日本語化

**解決日**: 2026-01-26

フィルターのステータスドロップダウンを日本語のみに統一（Planned → 予定 等）。

**元:** `backlog.md::2-2` (2026-01-18)

---

### 11-4. ConfirmedLinesPage のSAP一括登録ボタン重複

**解決日**: 2026-01-26
**状態**: 確認時点で既に修正済み（ボタンは1箇所のみ）

**元:** `backlog.md::2-4` (2026-01-18)

---

### 11-5. 本番コードの print() 文削除

**解決日**: 2026-01-26
**状態**: 確認時点で既に対応済み（logger使用に移行済み、またはコメント/テストコード内のみ）

**元:** `BACKLOG.md::8-9` (2026-01-26)

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

### 5-3. Playwright E2Eテスト DBリセット失敗 (500 Error)

**優先度**: High
**作成**: 2026-02-01
**カテゴリ**: テスト環境・CI

**背景・課題:**
PlaywrightによるE2Eテスト実行時、`beforeAll` フックで呼び出される `/api/admin/reset-database` エンドポイントが `500 Internal Server Error` で失敗する。これにより後続のテストが全て失敗する。

**症状:**
- `curl` コマンドによる手動実行は **成功 (200 OK)** する。
- Playwrightテストランナーからの実行時のみ **失敗 (500 Error)** する。
- エラー内容は `psycopg2.errors.LockNotAvailable` であったが、対策後も500エラーが継続（詳細ログはテストランナーが出力）。

**実施済みの対応:**
1. **DBロック競合対策**: `truncate_all_tables` に `pg_terminate_backend` を使用した他セッション強制切断処理を追加（`backend/app/core/database.py`）。
2. **テストユーザー自動作成**: DBリセット時に管理者だけでなく一般ユーザー(`user`)も作成するように修正（`backend/app/presentation/api/routes/admin/admin_router.py`）。
3. **テストコード修正**: `e2e-04-permission.spec.ts` で `resetDatabase` と `generateTestData` を呼ぶように修正。

**残課題:**
- Playwright環境特有の接続処理などが原因で、依然としてリセット処理が失敗している。
- テストランナーのDB接続設定、待機時間、ドライバの挙動などの調査が必要。

---

### 更新履歴

- 2026-01-24: 9ファイルを統合し、単一バックログとして整理
- 2026-01-26: クイックウィン4件対応 (1-4, 2-2, 2-4, 8-9)
- 2026-01-26: Excelビュー機能タスク追加 (セクション10)、仕入先表示・forecast_period表示修正完了
