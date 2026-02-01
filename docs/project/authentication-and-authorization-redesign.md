# 認証・認可の再設計

## 現状の問題

### 1. APIの認証要件が不統一
- 一部のAPIは `get_current_user_optional` で公開API
- 一部のAPIは `get_current_user` で認証必須
- フロントエンドは `httpPublic` と `httpAuth` の使い分けが曖昧
- **結果:** ゲストユーザーがダッシュボードを開くと401エラーが大量に発生

### 2. システム設定の「ページ表示制御」の意味が不明確
- ゲストユーザーに対してもON/OFFできる設定になっている
- しかし実際にはAPIが401を返すため、ONにしても使えない
- 一般ユーザーに対する制御なのか、ゲストに対する制御なのか不明

### 3. フロントエンドのエラーハンドリング不足
- 401エラーが発生してもコンソールにエラーが出るだけ
- ユーザーには「データの取得に失敗しました」としか表示されない
- ログインが必要なのか、権限がないのか、サーバーエラーなのか区別がつかない

## 提案する設計

### 原則

1. **すべての業務APIは認証必須** (`get_current_user`)
2. **ロールベースでアクセス制御** (ゲスト < 一般ユーザー < 管理者)
3. **ゲスト権限はハードコーディング** (システム設定では変更不可)
4. **システム設定の「ページ表示制御」は一般ユーザー向け**

### ロール定義

#### ゲスト (guest)
- **権限:** 読み取りのみ、限定的なページのみアクセス可能
- **ハードコーディング:** フロントエンド・バックエンド両方で固定
- **アクセス可能:**
  - ✅ ダッシュボード（読み取り）
  - ✅ 在庫一覧（読み取り）
  - ✅ ロット一覧（読み取り）
  - ❌ 受注管理（アクセス不可）
  - ❌ マスタ管理（アクセス不可）
  - ❌ システム設定（アクセス不可）
  - ❌ すべての編集・削除操作（アクセス不可）

#### 一般ユーザー (user)
- **権限:** 業務操作が可能（受注登録、在庫照会など）
- **システム設定で制御:** 管理者が「ページ表示制御」で機能のON/OFFを設定可能
- **アクセス可能:**
  - ✅ ダッシュボード
  - ✅ 在庫管理（読み書き）
  - ✅ 受注管理（読み書き）
  - ✅ OCR結果（読み書き）
  - ❌ マスタ管理（アクセス不可）
  - ❌ システム設定（アクセス不可）

#### 管理者 (admin)
- **権限:** すべての操作が可能
- **システム設定の影響を受けない:** 常にすべてのページにアクセス可能
- **アクセス可能:**
  - ✅ すべてのページ
  - ✅ すべての操作

### バックエンド実装

#### 1. すべてのAPIエンドポイントに認証を追加

```python
# BAD: 現状（公開API）
@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),  # オプショナル
):
    ...

# GOOD: 提案（認証必須）
@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),  # 認証必須
):
    ...
```

#### 2. ロールチェックを実装

```python
# app/presentation/api/routes/auth/auth_router.py に追加

def require_role(allowed_roles: list[str]):
    """ロール要件をチェックするデコレータ"""
    def dependency(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"この操作には {', '.join(allowed_roles)} ロールが必要です"
            )
        return current_user
    return dependency

# 使用例
@router.post("/orders")
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["user", "admin"])),  # ゲスト不可
):
    ...

@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["guest", "user", "admin"])),  # ゲスト可
):
    ...
```

#### 3. 読み取り専用チェック

```python
def require_write_permission():
    """書き込み権限をチェック（ゲストは不可）"""
    def dependency(current_user=Depends(get_current_user)):
        if current_user.role == "guest":
            raise HTTPException(
                status_code=403,
                detail="ゲストユーザーは読み取り専用です"
            )
        return current_user
    return dependency

# 使用例
@router.post("/lots")
def create_lot(
    lot: LotCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_permission()),  # ゲスト不可
):
    ...
```

### フロントエンド実装

#### 1. ゲスト権限をハードコーディング

```typescript
// frontend/src/features/auth/permissions/guest-permissions.ts

/**
 * ゲストユーザーの固定権限
 * システム設定では変更不可
 */
export const GUEST_PERMISSIONS = {
  // ページアクセス
  canAccessDashboard: true,
  canAccessInventory: true,
  canAccessLots: true,
  canAccessOrders: false,
  canAccessMasters: false,
  canAccessSettings: false,
  canAccessRPA: false,
  canAccessOCR: false,

  // 操作権限
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canExport: true,  // 読み取り専用のエクスポートは可能
} as const;
```

#### 2. AccessGuard を更新

```typescript
// frontend/src/components/auth/AccessGuard.tsx

export function AccessGuard({ children, routeKey, roles }: AccessGuardProps) {
  const { user } = useAuth();

  // ゲストユーザーの場合はハードコーディングされた権限をチェック
  if (user?.role === "guest") {
    const canAccess = checkGuestPermission(routeKey);
    if (!canAccess) {
      return <GuestRestrictedMessage />;
    }
    return <>{children}</>;
  }

  // 一般ユーザーの場合はシステム設定をチェック
  const hasPermission = usePermission({ routeKey });
  if (!hasPermission) {
    return <PermissionDeniedMessage />;
  }

  return <>{children}</>;
}

function GuestRestrictedMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">ゲストユーザーはアクセスできません</h1>
      <p className="text-gray-600 mb-8">
        この機能を使用するには、一般ユーザーまたは管理者としてログインしてください。
      </p>
      <Button onClick={() => navigate("/login")}>ログインページへ</Button>
    </div>
  );
}
```

#### 3. システム設定UIの説明を更新

```tsx
// frontend/src/features/settings/components/FeatureAccessControl.tsx

<CardDescription>
  一般ユーザーに対する機能ごとの表示/非表示をロール別に制御します。
  ※ ゲストユーザーの権限は固定されており、ここでは変更できません。
  ※ 管理者は常にすべての機能にアクセス可能です。
</CardDescription>

// ゲスト列を削除し、一般ユーザーのみ表示
<div className="grid grid-cols-2 gap-4">
  <div className="font-medium">機能・ページ・タブ</div>
  <div className="font-medium">一般ユーザー</div>
</div>
```

### httpPublic の使い方

`httpPublic` は **認証不要の公開API専用** とする。

```typescript
// 使用例

// BAD: ダッシュボード統計（認証必須なのにhttpPublicを使用）
export const api = {
  getDashboardStats: () => httpPublic.get<DashboardStats>("dashboard/stats"),
};

// GOOD: ダッシュボード統計（認証必須なのでhttpAuthを使用）
export const api = {
  getDashboardStats: () => httpAuth.get<DashboardStats>("dashboard/stats"),
};

// GOOD: ログイン（認証不要なのでhttpPublicを使用）
export const authApi = {
  login: (credentials: LoginRequest) =>
    httpPublic.post<LoginResponse>("auth/login", credentials),
};
```

## 実装タスク

### Phase 1: バックエンド認証強化
1. すべてのAPIエンドポイントに `get_current_user` を追加
2. `require_role()` デコレータを実装
3. `require_write_permission()` デコレータを実装
4. 各エンドポイントに適切なロールチェックを追加

### Phase 2: フロントエンド権限管理
1. `GUEST_PERMISSIONS` を定義
2. `AccessGuard` を更新（ゲスト権限のハードコーディング）
3. システム設定UIから「ゲスト」列を削除
4. すべてのAPIクライアントを `httpAuth` に統一（ログイン以外）

### Phase 3: エラーハンドリング改善
1. 401エラー時の自動ログインリダイレクト
2. 403エラー時の権限不足メッセージ表示
3. ゲストユーザー向けの「ログインしてください」UI

## 参考資料

- `frontend/src/features/auth/permissions/config.ts` - 現在の権限設定
- `frontend/src/components/auth/AccessGuard.tsx` - アクセスガード実装
- `backend/app/presentation/api/routes/auth/auth_router.py` - 認証ルーター
- `frontend/src/shared/api/http-client.ts` - HTTPクライアント実装

## 関連Issue

- ゲストユーザーのダッシュボードアクセス時の401エラー問題
