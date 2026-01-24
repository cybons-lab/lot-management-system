# RBAC 実装計画（調査・段階導入）

## 1. 現状調査

### 認証状態の持ち方（FE）
- 認証は `AuthContext` で管理。`user`・`token` を localStorage の `token` と `/api/auth/me` で復元しています。ログアウトは token の削除と `user` のクリアのみです。【F:frontend/src/features/auth/AuthContext.tsx†L1-L94】
- 擬似ログインは `/api/auth/login` を叩き、返ってきた `access_token` と `user` を保存する方式です。【F:frontend/src/features/auth/AuthContext.tsx†L64-L90】
- 401 は `AUTH_ERROR_EVENT` で通知し、AuthContext 側で toast + logout によって処理しています。【F:frontend/src/shared/api/http-client.ts†L52-L188】【F:frontend/src/features/auth/AuthContext.tsx†L25-L56】

### API 呼び出し（FE）
- HTTP クライアントは ky で共通化され、`http` wrapper 経由で JSON を返します。`Authorization` は beforeRequest で付与しています。【F:frontend/src/shared/api/http-client.ts†L207-L305】
- TanStack Query は `query-client.ts` でデフォルト設定（staleTime/ retry 等）を定義しています。【F:frontend/src/shared/libs/query-client.ts†L1-L141】

### ルーティング構成（FE）
- ルーティングは `MainRoutes.tsx` に集約され、`AdminGuard` / `RoleGuard` によるガードは一部のみです（管理系やカレンダー）。【F:frontend/src/MainRoutes.tsx†L1-L319】
- `AdminGuard` は admin ロール以外をダッシュボードへリダイレクトします。【F:frontend/src/components/auth/AdminGuard.tsx†L1-L154】
- `RoleGuard` は指定ロール以外をダッシュボードへリダイレクトします。【F:frontend/src/components/auth/RoleGuard.tsx†L1-L28】

### タブ実装の実態
- URL なしタブ（ローカル state/フィルタ）: 例）在庫一覧のタブは Jotai の `filters.tab` と `updateFilter` で切り替えています（`/inventory` の URL は同一）。【F:frontend/src/features/inventory/pages/InventoryPage.tsx†L33-L152】
- URL ありタブ: 例）在庫履歴は `tab` を searchParams に反映しています（`/inventory/history?tab=...` 形式）。【F:frontend/src/features/inventory/pages/StockHistoryPage.tsx†L1-L70】
- コンポーネント内タブ: `TabsTrigger`/`TabsContent` を利用した UI タブが複数存在します（商品詳細、DBブラウザ等）。【F:frontend/src/features/products/components/ProductDetailDialog.tsx†L1-L140】【F:frontend/src/features/debug-db/components/DbObjectDetail.tsx†L1-L214】

### 認可（BE）
- FastAPI には `get_current_user` / `get_current_admin` / `get_current_user_or_above` があり、ロールチェックは admin または user での分岐が中心です。【F:backend/app/presentation/api/routes/auth/auth_router.py†L18-L82】
- 現状の未ログインは基本的に 401 を返す設計です（`get_current_user` 依存）。【F:backend/app/presentation/api/routes/auth/auth_router.py†L34-L54】

---

## 2. 実装計画（段階導入）

### Phase 1: 静的 RBAC（コード内定義で最短導入）
**狙い:** 「admin/user/guest」ロールでルート/タブ/操作を制御し、UI と API 両方で拒否できる状態をまず作る。

- **FE**
  - `AccessGuard` を作成し、`requiredRoles` のルートガードを統一化。
  - `tabDefinitions` を導入し、`tab_key` と `allowed_roles` を持つ構造に移行。
  - `operationPermissions` を定義し、ボタン表示・無効化（例: `can("inventory:create")`）を導入。
  - 401/403 を共通処理し、401=再ログイン誘導、403=権限不足表示。
- **BE**
  - `require_roles([...])` 依存を用意し、操作系エンドポイントに付与。
  - 既存の `get_current_*` を補助的に使いつつ、`guest` を明示的に扱う。（※未ログイン=guest）

### Phase 2: 権限設定の DB 化
**狙い:** ルート/タブ/操作権限を API から動的取得できるようにする。

- 権限テーブル例:
  - `page_permissions` (page_key, kind(route|tab|operation), parent_page_key, allowed_roles, enabled, updated_at, updated_by)
- `GET /permissions` で FE が取得し、キャッシュ (TanStack Query) で保持。

### Phase 3: 管理画面での権限編集
**狙い:** 管理者が UI から権限を変更できる。

- CRUD UI を追加し、変更プレビューやロール別プレビューを実装。
- 事故防止策:
  - admin は常に全許可（自分締め出し防止）
  - 変更プレビュー/差分表示
  - 監査ログ
  - 設定取得失敗時は静的定義へフォールバック

---

## 3. 変更ファイル一覧（予定）

### FE
- `frontend/src/components/auth/AccessGuard.tsx`
  - ルートガード統一、guest を未ログイン扱いとして login へ誘導。
- `frontend/src/features/auth/permissions.ts`
  - `routePermissions` / `tabPermissions` / `operationPermissions` 定義。
- `frontend/src/shared/api/http-client.ts`
  - 401/403 の共通通知、AuthExpiredOverlay / Forbidden 表示を連携。
- `frontend/src/shared/libs/query-client.ts`
  - 401/403 の retry 停止。
- `frontend/src/components/permissions/*`
  - `TabGuard` / `OperationGuard` など UI 側の制御。

### BE
- `backend/app/presentation/api/routes/auth/auth_router.py`
  - `require_roles` 追加。guest の扱いを統一。
- `backend/app/presentation/api/routes/**`
  - 書き込み系 API に `require_roles(["admin","user"])` を追加。
  - 参照系 API は `guest` 許可を検討。

---

## 4. 権限データ設計案

```text
role: admin | user | guest

route_permissions:
  route_key -> allowed_roles

tab_permissions:
  (route_key, tab_key) -> allowed_roles

operation_permissions:
  operation_key -> allowed_roles
```

### DB 化のテーブル案
```text
page_permissions(
  id,
  page_key,
  kind,                 -- route | tab | operation
  parent_page_key,      -- tab/operation の親
  allowed_roles,        -- 文字列配列 or jsonb
  enabled,
  updated_at,
  updated_by
)
```

---

## 5. 認可設計（詳細）

### A) ルートガード
- React Router のルート定義に `requiredRoles` を付与。
- guest = 未ログインとみなし、ログイン必須ページは `/login?returnTo=` へ誘導。
- role 不一致は 403 画面へ。

### B) タブガード
- タブ定義に `tab_key` / `allowed_roles` を持たせる。
- UI では表示/非表示 or 無効化。
- URL ありタブはルートガードで 403 へ。

### C) 操作ガード
- FE: ボタン非表示 or disable。
- BE: `require_roles` + 条件チェック。
- adminHardDelete 例:
  - `role=admin`
  - 関連データなし
  - 追加条件（時間制限 or status フラグ）を検討

---

## 6. 401/403 共通処理

- ky wrapper で 401/403 を一元通知。
- 401: AuthExpiredOverlay で操作ロック + 再ログイン導線（returnTo 付き）。
- 403: 権限不足表示。
- QueryClient の retry は 401/403 で停止。
- ポーリングは 401 発生時に停止。

---

## 7. 受け入れ条件（Acceptance Criteria）

- guest:
  - 許可ページ/タブのみ閲覧可能（URL 直打ちも弾く）
  - 書き込み操作は必ず 403
- user:
  - 基本機能は利用可
  - 制限ページ/タブ/操作は 403 + UI で非表示/無効化
- admin:
  - 全機能 OK
  - adminHardDelete は「関連データなし」条件でのみ成功
- 認証切れ:
  - 401 で操作ロック + 再ログイン誘導
  - 401/403 で無限リトライ/ログ連打が起きない

---

## 8. テスト観点（最低限）

- **ユニット**
  - permission 判定関数（route/tab/operation）
  - AccessGuard / TabGuard の分岐
- **結合**
  - ky wrapper の 401/403 処理
  - overlay 表示
  - retry 停止 + ポーリング停止
- **E2E (Playwright)**
  - guest/user/admin でページ遷移
  - タブ制限
  - 操作制限
  - adminHardDelete 条件確認

---

## 9. JWT 導入時の差し替えポイント

- `/auth/login` の実装を JWT 発行に切り替え
- `/auth/me` を JWT からの user 復元に切り替え
- token 保存: Cookie (HttpOnly) 推奨
- refresh 戦略: refresh token + ローテーション
- CSRF 対策（Cookie 使用時）
- FE の token 保持ロジック（localStorage → Cookie）差し替え

---

## 10. 質問リスト（未確定事項）

1. adminHardDelete の対象エンティティはどれか？
2. adminHardDelete の時間制限や status フラグを採用するか？
3. guest が閲覧可能な具体ページ一覧は？（例: dashboard/在庫一覧/ヘルプ）
4. user に制限したい「操作」一覧（例: マスタ削除/バッチ起動等）は？
5. 403 画面は「ページ遷移型」か「オーバーレイ型」どちらが希望か？
