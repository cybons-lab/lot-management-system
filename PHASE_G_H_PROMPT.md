# Phase G/H 実装プロンプト

## 🎯 ミッション

あなたはこのリポジトリの「フロントエンド実装エンジニア」です。
Phase D, E, F の実装が完了しました。次のフェーズである **Phase G** と **Phase H** を順次進めてください。

---

## 📊 これまでの進捗状況

### ✅ Phase D: Inventory Adjustments & Items（完了 - 2025-11-14）
- Adjustments API & Hooks 実装
- Adjustments 画面実装（List, Create, Form）
- Inventory Items API & Hooks 実装
- Inventory Items 画面実装（SummaryPage更新、DetailPage作成）
- ルーティング追加

**成果物**: 10ファイル変更 (+916行/-43行)

### ✅ Phase E: Allocations New API Migration Foundation（完了 - 2025-11-14）
- Allocations API v2.2.1 実装（新エンドポイント5つ）
- Allocations Hooks 実装（新hooks 5つ）
- 使用ガイド作成（README.md）
- 旧API互換性維持

**成果物**: 5ファイル変更 (+530行/-17行)

### ✅ Phase F: LotAllocationPage 部分移行（完了 - 2025-11-15）
- **候補ロット取得**: `useLotsQuery` → `useAllocationCandidates` に移行完了 ✅
- **手動引当保存**: 旧API維持（`useAllocationMutation` → `POST /allocations/drag-assign`） ⚠️

**理由**: 新API `/allocations/commit` はFEFO自動引当のみ対応、手動複数ロット引当には未対応
**移行期限**: 2026-02-15（猶予あり）

**成果物**: 2ファイル変更 (+34行/-35行)
**コミット**: `2954af8` on `claude/phase-f-lotallocation-migration-016aQuFASaqbXq6x8SCiaoba`

---

## ⚠️ 重要な注意事項

### 手動引当の仕様について

Phase F で発見された問題により、**手動引当の保存機能は旧API（deprecated）を一時的に使用しています**。

**現状**:
- 候補ロット取得: ✅ 新API `GET /allocation-candidates`
- 手動引当保存: ⚠️ 旧API `POST /allocations/drag-assign` (deprecated)

**背景**:
- 新API `/allocations/commit` は**FEFO自動引当専用**で、手動複数ロット引当に未対応
- 現在のUIは「複数ロットに数量を手動入力して一括保存」するフロー
- バックエンド側で手動引当確定APIを実装するまで、旧APIを使用継続

**Phase G/H への影響**:
⚠️ **Phase G/H の実装結果により、手動引当の仕様が変更される可能性があります**

具体的には：
1. **新しい引当フローが発見される可能性** - Phase G/H で実装する画面が、別の引当パターンを要求するかもしれません
2. **バックエンドAPI拡張の必要性** - Phase G/H の要件により、バックエンド側で追加APIが必要になる可能性があります
3. **UI/UXの統一性** - Phase G/H の実装により、引当UIの統一パターンが確立され、Phase Fで実装した部分の見直しが必要になる可能性があります

**対応方針**:
- Phase G/H では、既存の引当UIパターンを**そのまま参考にしつつ**、新しい要件には柔軟に対応する
- 引当関連の新機能を実装する際は、Phase Fとの整合性を考慮する
- 必要に応じて Phase F の実装を見直すことも検討する（移行期限: 2026-02-15）

---

## 🚀 次に進むべきフェーズ

### 順序の推奨

計画書（`docs/frontend/frontend_refactor_plan_v2.2.md`）によると、次の順序が推奨されています：

1. **Phase F (計画書版): Masters API 移行** - 簡単（3ファイルのURL変更のみ）⚠️ **スキップ可能**
2. **Phase G: Customer Items・Users & Roles** ← **次はここから開始**
3. **Phase H: Admin（Operation Logs・Business Rules・Batch Jobs）**

**推奨**: Phase F (Masters API 移行) は非常に簡単なので、Phase G と並行して実施するか、Phase G 完了後にまとめて対応してもOKです。

---

## 📋 Phase G: Customer Items・Users & Roles（Week 13-14、優先度：🟡 Medium）

### 🎯 ゴール

得意先品番マッピング機能とユーザー・ロール管理機能の実装

### タスク G-1: Customer Items API・画面実装

#### 必要なファイル

1. **API Layer**:
   - `frontend/src/features/customer-items/api.ts` - API呼び出し関数
   - `frontend/src/features/customer-items/hooks/useCustomerItems.ts` - TanStack Query hooks
   - `frontend/src/features/customer-items/hooks/useCustomerItemMutations.ts` - Mutation hooks

2. **Components**:
   - `frontend/src/features/customer-items/pages/CustomerItemsListPage.tsx` - 一覧画面
   - `frontend/src/features/customer-items/components/CustomerItemForm.tsx` - 登録フォーム
   - `frontend/src/features/customer-items/components/CustomerItemTable.tsx` - テーブル表示

3. **Types**:
   - `frontend/src/features/customer-items/types.ts` - 型定義

4. **Routing**:
   - `frontend/src/App.tsx` - ルート追加: `/masters/customer-items`

#### API エンドポイント

| HTTPメソッド | エンドポイント | 説明 |
|------------|---------------|------|
| GET | `/customer-items` | 得意先品番一覧取得 |
| POST | `/customer-items` | 得意先品番登録 |
| GET | `/customer-items/{customer_id}` | 特定得意先の品番一覧 |
| DELETE | `/customer-items/{customer_id}/{product_id}` | 得意先品番削除 |

#### 実装ステップ

1. `features/customer-items/` ディレクトリ構造を作成
2. API関数を実装（`api.ts`）
3. TanStack Query hooks を実装（`hooks/`）
4. 一覧ページを実装（`pages/CustomerItemsListPage.tsx`）
5. 登録フォームを実装（`components/CustomerItemForm.tsx`）
6. ルーティングを追加（`App.tsx`）
7. 動作確認

#### 成果物
- Customer Items 機能一式（API, Hooks, Pages, Components）
- ルーティング設定
- 型定義

---

### タスク G-2: Users & Roles API・画面実装

#### 必要なファイル

1. **Users Feature**:
   - `frontend/src/features/users/api.ts` - Users API
   - `frontend/src/features/users/hooks/useUsers.ts` - Users Query hooks
   - `frontend/src/features/users/hooks/useUserMutations.ts` - Users Mutation hooks
   - `frontend/src/features/users/pages/UsersListPage.tsx` - ユーザー一覧
   - `frontend/src/features/users/pages/UserDetailPage.tsx` - ユーザー詳細
   - `frontend/src/features/users/components/UserForm.tsx` - ユーザーフォーム
   - `frontend/src/features/users/components/RoleAssignmentForm.tsx` - ロール割当フォーム
   - `frontend/src/features/users/types.ts` - 型定義

2. **Roles Feature**:
   - `frontend/src/features/roles/api.ts` - Roles API
   - `frontend/src/features/roles/hooks/useRoles.ts` - Roles Query hooks
   - `frontend/src/features/roles/hooks/useRoleMutations.ts` - Roles Mutation hooks
   - `frontend/src/features/roles/pages/RolesListPage.tsx` - ロール一覧
   - `frontend/src/features/roles/components/RoleForm.tsx` - ロールフォーム
   - `frontend/src/features/roles/types.ts` - 型定義

3. **Routing**:
   - `frontend/src/App.tsx` - ルート追加: `/settings/users`, `/settings/users/:id`, `/settings/roles`

#### Users API エンドポイント

| HTTPメソッド | エンドポイント | 説明 |
|------------|---------------|------|
| GET | `/users` | ユーザー一覧取得 |
| POST | `/users` | ユーザー作成 |
| GET | `/users/{id}` | ユーザー詳細取得 |
| PUT | `/users/{id}` | ユーザー更新 |
| DELETE | `/users/{id}` | ユーザー削除 |
| PATCH | `/users/{id}/roles` | ロール割当 |

#### Roles API エンドポイント

| HTTPメソッド | エンドポイント | 説明 |
|------------|---------------|------|
| GET | `/roles` | ロール一覧取得 |
| POST | `/roles` | ロール作成 |
| GET | `/roles/{id}` | ロール詳細取得 |
| PUT | `/roles/{id}` | ロール更新 |

#### 実装ステップ

1. `features/users/` と `features/roles/` ディレクトリ構造を作成
2. Users API関数を実装
3. Roles API関数を実装
4. Users TanStack Query hooks を実装
5. Roles TanStack Query hooks を実装
6. ユーザー一覧ページを実装
7. ユーザー詳細ページを実装（ロール割当含む）
8. ロール一覧ページを実装
9. ルーティングを追加
10. 動作確認

#### 成果物
- Users & Roles 管理機能一式（API, Hooks, Pages, Components）
- ルーティング設定
- 型定義

---

## 📋 Phase H: Admin（Operation Logs・Business Rules・Batch Jobs）実装（Week 15-16、優先度：🟢 Low）

### 🎯 ゴール

管理機能（操作ログ、業務ルール、バッチジョブ）の実装

### タスク H-1: Operation Logs API・画面実装

#### 必要なファイル

1. **API Layer**:
   - `frontend/src/features/operation-logs/api.ts`
   - `frontend/src/features/operation-logs/hooks/useOperationLogs.ts`

2. **Pages**:
   - `frontend/src/features/operation-logs/pages/OperationLogsPage.tsx`

3. **Components**:
   - `frontend/src/features/operation-logs/components/OperationLogTable.tsx`
   - `frontend/src/features/operation-logs/components/OperationLogDetailModal.tsx`

4. **Routing**:
   - `frontend/src/App.tsx` - ルート追加: `/admin/operation-logs`

#### API エンドポイント

| HTTPメソッド | エンドポイント | 説明 |
|------------|---------------|------|
| GET | `/operation-logs` | 操作ログ一覧取得 |
| GET | `/operation-logs/{id}` | 操作ログ詳細取得 |

#### 成果物
- Operation Logs 機能一式

---

### タスク H-2: Business Rules API・画面実装

#### 必要なファイル

1. **API Layer**:
   - `frontend/src/features/business-rules/api.ts`
   - `frontend/src/features/business-rules/hooks/useBusinessRules.ts`
   - `frontend/src/features/business-rules/hooks/useBusinessRuleMutations.ts`

2. **Pages**:
   - `frontend/src/features/business-rules/pages/BusinessRulesPage.tsx`

3. **Components**:
   - `frontend/src/features/business-rules/components/BusinessRuleTable.tsx`
   - `frontend/src/features/business-rules/components/BusinessRuleForm.tsx`

4. **Routing**:
   - `frontend/src/App.tsx` - ルート追加: `/admin/business-rules`

#### API エンドポイント

| HTTPメソッド | エンドポイント | 説明 |
|------------|---------------|------|
| GET | `/business-rules` | 業務ルール一覧取得 |
| GET | `/business-rules/{code}` | 業務ルール詳細取得 |
| PUT | `/business-rules/{code}` | 業務ルール更新 |

#### 成果物
- Business Rules 機能一式

---

### タスク H-3: Batch Jobs API・画面実装

#### 必要なファイル

1. **API Layer**:
   - `frontend/src/features/batch-jobs/api.ts`
   - `frontend/src/features/batch-jobs/hooks/useBatchJobs.ts`
   - `frontend/src/features/batch-jobs/hooks/useBatchJobMutations.ts`

2. **Pages**:
   - `frontend/src/features/batch-jobs/pages/BatchJobsPage.tsx`

3. **Components**:
   - `frontend/src/features/batch-jobs/components/BatchJobTable.tsx`
   - `frontend/src/features/batch-jobs/components/BatchJobExecuteButton.tsx`

4. **Routing**:
   - `frontend/src/App.tsx` - ルート追加: `/admin/batch-jobs`

#### API エンドポイント

| HTTPメソッド | エンドポイント | 説明 |
|------------|---------------|------|
| GET | `/batch-jobs` | バッチジョブ一覧取得 |
| GET | `/batch-jobs/{id}` | バッチジョブ詳細取得 |
| POST | `/batch-jobs/{id}/execute` | バッチジョブ実行 |

#### 成果物
- Batch Jobs 機能一式

---

## 🔧 実装ルール

### 必須ルール

1. **段階的実装**: 一度に全て実装せず、機能単位で実装
2. **API → Hooks → Pages → Components** の順序で実装
3. **既存パターンの踏襲**: Phase D, E で実装した Adjustments/Inventory Items のパターンを参考にする
4. **エラーハンドリング**: API呼び出しには適切なエラーハンドリングを実装
5. **ローディング状態**: TanStack Query の `isLoading`, `isError` を活用

### コーディング規約

- TypeScript strict mode 必須
- TanStack Query によるサーバー状態管理
- ルート定数 (`constants/routes.ts`) 使用
- コンポーネントは関数コンポーネント
- Absolute imports (`@/`) を使用

### コミットルール

- 機能単位でコミット
- コミットメッセージは `feat(frontend): Phase G/H - [機能名]`
- 大きな変更の場合は中間コミットも検討

---

## 📁 重要なファイル

### 参考実装

#### Phase D で実装済み（参考にできる）
- `frontend/src/features/adjustments/api.ts` - API実装パターン
- `frontend/src/features/adjustments/hooks/useAdjustments.ts` - Query hooks パターン
- `frontend/src/features/adjustments/hooks/useAdjustmentMutations.ts` - Mutation hooks パターン
- `frontend/src/features/adjustments/pages/AdjustmentsListPage.tsx` - 一覧ページパターン
- `frontend/src/features/adjustments/pages/AdjustmentCreatePage.tsx` - 作成ページパターン
- `frontend/src/features/inventory/pages/InventoryItemDetailPage.tsx` - 詳細ページパターン

#### Phase E で実装済み（参考にできる）
- `frontend/src/features/allocations/api.ts` - 新API実装パターン
- `frontend/src/features/allocations/hooks/useAllocationCandidates.ts` - Query hooks パターン
- `frontend/src/features/allocations/hooks/useAllocationSuggestions.ts` - Mutation hooks パターン
- `frontend/src/features/allocations/README.md` - API使用ガイド

### 計画書・仕様書

- `docs/frontend/frontend_refactor_plan_v2.2.md` - フロントエンド計画書
- `docs/architecture/api_refactor_plan_v2.2.md` - バックエンドAPI仕様書
- `CLAUDE.md` - プロジェクト開発ガイド

### バックエンドAPI

バックエンド API は **Phase 1〜4 完了** しており、以下のエンドポイントが利用可能です：

- Customer Items API: `/api/customer-items` ✅ 実装済み
- Users API: `/api/users` ✅ 実装済み
- Roles API: `/api/roles` ✅ 実装済み
- Operation Logs API: `/api/operation-logs` ✅ 実装済み
- Business Rules API: `/api/business-rules` ✅ 実装済み
- Batch Jobs API: `/api/batch-jobs` ✅ 実装済み

**API ドキュメント**: http://localhost:8000/api/docs（サーバー起動時）

---

## 🚀 開始方法

### Phase G の実装を以下の順序で進めてください：

#### ステップ 1: Phase G-1 (Customer Items)

1. **ディレクトリ構造作成**
   ```bash
   mkdir -p frontend/src/features/customer-items/{api,hooks,pages,components}
   ```

2. **API Layer 実装** (`api.ts`)
   - `GET /customer-items` - 一覧取得
   - `POST /customer-items` - 登録
   - `GET /customer-items/{customer_id}` - 得意先別一覧
   - `DELETE /customer-items/{customer_id}/{product_id}` - 削除

3. **Hooks 実装**
   - `useCustomerItems.ts` - Query hooks
   - `useCustomerItemMutations.ts` - Mutation hooks

4. **Pages & Components 実装**
   - `CustomerItemsListPage.tsx` - 一覧画面
   - `CustomerItemForm.tsx` - 登録フォーム
   - `CustomerItemTable.tsx` - テーブル表示

5. **Routing 追加**
   - `App.tsx` に `/masters/customer-items` ルートを追加

6. **動作確認**
   - 一覧表示
   - 登録
   - 削除

7. **コミット & プッシュ**

#### ステップ 2: Phase G-2 (Users & Roles)

1. **ディレクトリ構造作成**
   ```bash
   mkdir -p frontend/src/features/users/{api,hooks,pages,components}
   mkdir -p frontend/src/features/roles/{api,hooks,pages,components}
   ```

2. **Users API Layer 実装**
3. **Roles API Layer 実装**
4. **Users Hooks 実装**
5. **Roles Hooks 実装**
6. **Users Pages & Components 実装**
7. **Roles Pages & Components 実装**
8. **Routing 追加**
9. **動作確認**
10. **コミット & プッシュ**

#### ステップ 3: Phase H (Admin機能)

Phase G が完了したら、Phase H に進んでください。
Phase H は 3つのサブタスク（H-1, H-2, H-3）に分かれており、各々を順次実装します。

---

## 📝 完了後の報告

各フェーズ完了時に、以下の情報を報告してください：

1. **実装サマリ**
   - 変更ファイル数
   - 追加行数 / 削除行数
   - 実装した機能一覧

2. **コミット情報**
   - コミットハッシュ
   - ブランチ名
   - プッシュ完了確認

3. **動作確認結果**
   - API接続確認
   - 主要機能の動作確認
   - エラーハンドリング確認

4. **未完了・保留事項**
   - 実装できなかった機能
   - 保留にした理由
   - 次のステップでの対応方針

---

## 🎯 最終ゴール

Phase G と Phase H が完了すると、以下が達成されます：

✅ 得意先品番マッピング機能の完全実装
✅ ユーザー・ロール管理機能の完全実装
✅ 管理機能（操作ログ、業務ルール、バッチジョブ）の完全実装
✅ バックエンドAPI v2.2.1 の全機能に対応したフロントエンド実装
✅ 新API v2.2.1 への移行準備完了（Phase I へ）

---

よろしくお願いします！🚀
