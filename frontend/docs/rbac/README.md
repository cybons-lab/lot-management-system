# RBAC (Role-Based Access Control) ガイド

## 概要

本システムでは、ロールベースのアクセス制御（RBAC）を実装しています。
ユーザーのロールに基づいて、ルート（URL）、タブ、操作の3レベルでアクセスを制御します。

## デフォルトdeny方針

**重要**: 本システムはデフォルトdeny方針を採用しています。

- **未定義ルートは自動的にForbidden**になります
- 新規ページを追加する際は、必ず `config.ts` に権限設定を追加してください
- 権限設定漏れがあると、そのページにはアクセスできません（安全側に倒す設計）
- 開発環境では、未定義ルートへのアクセス時にコンソール警告が表示されます

```
[AccessGuard] 未定義パス: "/new-page"
→ config.ts の routePermissions に追加してください。
→ デフォルトdeny方針により、このルートはForbiddenになります。
```

## ロール定義

| ロール  | 説明         | アクセス範囲                           |
| ------- | ------------ | -------------------------------------- |
| `admin` | 管理者       | 全機能アクセス可能                     |
| `user`  | 一般ユーザー | 業務機能アクセス可能（管理機能は不可） |
| `guest` | 未ログイン   | 閲覧のみ（一部ページのみアクセス可能） |

**重要**: 未ログイン状態は自動的に `guest` として扱われます。

## 権限設定ファイル

権限設定は `frontend/src/features/auth/permissions/config.ts` で管理されています。

### ルート権限（routePermissions）

```typescript
{ routeKey: "ADMIN.INDEX", path: "/admin", allowedRoles: ["admin"] }
```

- `routeKey`: ルートの識別子（ROUTES定数のキーに対応）
- `path`: URLパス
- `allowedRoles`: アクセス可能なロール

### タブ権限（tabPermissions）

```typescript
{ routeKey: "INVENTORY.ROOT", tabKey: "adjustments", allowedRoles: ["admin", "user"] }
```

### 操作権限（operationPermissions）

```typescript
{
  operationKey: "inventory:hardDelete",
  allowedRoles: ["admin"],
  additionalConditions: ["noRelatedData", "within5minutes"]
}
```

## 使い方

### 1. ルートガード（AccessGuard）

```tsx
// 方法1: roles を直接指定
<AccessGuard roles={["admin", "user"]}>
  <ProtectedPage />
</AccessGuard>

// 方法2: routeKey を指定（設定から自動取得）
<AccessGuard routeKey="ADMIN.INDEX">
  <AdminPage />
</AccessGuard>

// 方法3: 現在のパスから自動判定
<AccessGuard>
  <Page />
</AccessGuard>
```

### 2. タブガード

```tsx
import { TabGuard, useTabPermission } from "@/components/auth/TabGuard";

// コンポーネント版
<TabGuard routeKey="INVENTORY.ROOT" tabKey="adjustments">
  <AdjustmentsContent />
</TabGuard>;

// フック版
const canViewAdjustments = useTabPermission("INVENTORY.ROOT", "adjustments");
{
  canViewAdjustments && <TabsTrigger value="adjustments">調整</TabsTrigger>;
}
```

### 3. 操作ガード

```tsx
import { OperationGuard, useOperationPermission, useCan } from "@/components/auth/OperationGuard";

// コンポーネント版
<OperationGuard operationKey="inventory:delete">
  <Button onClick={handleDelete}>削除</Button>
</OperationGuard>;

// フック版
const canDelete = useOperationPermission("inventory:delete");

// useCan版（複数操作をまとめてチェック）
const can = useCan();
{
  can("inventory:create") && <Button>新規作成</Button>;
}
{
  can("inventory:delete") && <Button>削除</Button>;
}
```

## 401/403エラー処理

### 401 Unauthorized（認証エラー）

- トークンなし/期限切れの場合に発生
- `AUTH_ERROR_EVENT` カスタムイベントが発火
- AuthContextでキャッチし、以下を実行:
  - トースト通知表示
  - 自動ログアウト
  - `authError` を `"expired"` に設定
  - `AuthErrorOverlay` 表示

### 403 Forbidden（認可エラー）

- 権限不足の場合に発生
- `FORBIDDEN_ERROR_EVENT` カスタムイベントが発火
- ページ遷移型: `/forbidden` ページにリダイレクト

### TanStack Query での 401/403 対応

- 401/403 は retry しない（`query-client.ts` で設定済み）
- 認証状態読み込み中はクエリを発火しない（`useAuthenticatedQuery`）
- 認証期限切れ時はポーリング停止（`authAwareRefetchInterval`）

## ページ追加時チェックリスト

新しいページを追加する際は、以下を確認してください:

1. [ ] **`config.ts` の `routePermissions` にルート権限を追加**（必須！）
2. [ ] タブがある場合は `tabPermissions` にタブ権限を追加
3. [ ] 操作がある場合は `operationPermissions` に操作権限を追加
4. [ ] ルートに `AccessGuard` を適用（MainRoutes.tsx）
5. [ ] 認証必須APIを呼ぶ場合は `useAuthenticatedQuery` を使用
6. [ ] バックエンドで `require_roles()` を適用

**警告**: 手順1を忘れると、デフォルトdeny方針により新規ページはForbiddenになります。

## ルート定義漏れの検証

### 開発時の警告

開発環境では、未定義ルートへのアクセス時にコンソールに警告が表示されます。
この警告が出たら、`config.ts` に権限設定を追加してください。

### テストでの検証

```typescript
import { validateRouteDefinitions, reportUndefinedRoutes } from "@/features/auth/permissions";

// アプリケーションで使用しているパスのリスト
const actualPaths = ["/dashboard", "/orders", "/new-page"];

// 検証
const result = validateRouteDefinitions(actualPaths);
if (!result.isValid) {
  reportUndefinedRoutes(result.undefinedPaths);
  // テスト失敗
}
```

### routeKeyの検証

```typescript
import { validateRouteKeys, reportUndefinedRouteKeys } from "@/features/auth/permissions";

// 使用しているrouteKeyのリスト
const usedKeys = ["DASHBOARD", "ORDERS.LIST", "NEW_PAGE"];

// 検証
const undefinedKeys = validateRouteKeys(usedKeys);
if (undefinedKeys.length > 0) {
  reportUndefinedRouteKeys(undefinedKeys);
  // テスト失敗
}
```

## adminHardDelete条件

物理削除（hardDelete）は以下の条件を満たす場合のみ実行可能:

1. ロールが `admin` である
2. 関連データが存在しない（外部キー参照がゼロ）
3. 作成後5分以内である

設定: `hardDeleteConditions` in `config.ts`

## 将来のJWT化対応

現在は擬似ログイン（テスト用）ですが、将来のJWT化時に変更が必要な箇所:

| ファイル                                                  | 変更内容                       |
| --------------------------------------------------------- | ------------------------------ |
| `frontend/src/features/auth/AuthContext.tsx`              | ログインAPI呼び出し、token保存 |
| `frontend/src/shared/auth/token.ts`                       | Cookie保存への変更（推奨）     |
| `backend/app/presentation/api/routes/auth/auth_router.py` | JWT生成、検証ロジック          |

### Cookie保存（推奨）

本番環境では、tokenをlocalStorageではなくHttpOnly Cookieに保存することを推奨:

```typescript
// サーバーサイドでCookie設定
response.set_cookie(
  "access_token",
  token,
  (httponly = True),
  (secure = True),
  (samesite = "Strict"),
  (max_age = 3600),
);
```

### リフレッシュトークン戦略

長期間のセッション維持には、リフレッシュトークンの実装を検討:

1. アクセストークン: 短期間（例: 15分）
2. リフレッシュトークン: 長期間（例: 7日）
3. アクセストークン期限切れ時に自動リフレッシュ

## テスト観点

### Unit Tests

- `permissions/utils.ts`: 各権限チェック関数の正常/異常系
- `AccessGuard`: guest/user/adminのルートアクセス判定
- `TabGuard`: タブ表示/非表示の分岐
- `OperationGuard`: 操作許可/不許可の分岐
- **デフォルトdeny**: 未定義ルートがForbiddenになること

### Integration Tests

- `http-client.ts`: 401/403イベント発火、デバウンス動作
- `query-client.ts`: 401/403でretry停止

### E2E Tests

- guest遷移: guest許可ページ→OK, 非許可ページ→ログインリダイレクト
- user制限: admin専用ページ→forbidden
- **未定義ルート**: 存在しないパス→forbidden
- セッション期限切れ: 401発生→オーバーレイ→再ログイン導線
- 401時のポーリング停止: 長時間放置後も401ループしないこと
