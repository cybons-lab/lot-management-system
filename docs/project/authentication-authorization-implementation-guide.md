# 認証・認可システム再設計 - 実装ガイド

**関連:** [authentication-and-authorization-redesign.md](./authentication-and-authorization-redesign.md)

このドキュメントは、認証・認可の再設計提案を「実装に使える形」に落とし込んだものです。チェックリスト、棚卸し用テンプレート、ルートキー対応表を提供します。

---

## 実装前の重要な意思決定

ドキュメントでは「業務APIは認証必須（`get_current_user`）」が原則で、かつゲストもダッシュボード等は読める前提になっています。

**実装前に次のどちらで行くかをチーム内で固定する必要があります:**

### 方式A（推奨）: ゲストも「認証済み（role=guest）」として扱う
- ゲストトークン発行 or ゲストログインの仕組みを導入
- すべてのAPIで `get_current_user` を使用可能
- ロールベースのアクセス制御が統一される
- **メリット:** 原則と矛盾せず、実装が機械的になる

### 方式B: ゲスト可の一部APIだけ `optional` を残す
- 公開APIとして `get_current_user_optional` を使用
- **デメリット:** 原則と衝突しやすく、再び401エラーが発生するリスクがある

**以降のチェックリストは方式Aを前提とします。**

---

## 実装チェックリスト（Phase別）

### Phase 0: 棚卸し（最短で効く）

**目的:** どのAPI/画面がguest/user/adminでどうなるかを先に確定させ、実装を機械化する。

**タスク:**
- [ ] API一覧を抽出（FastAPI router単位でOK）
- [ ] 各APIに対して以下を記入（テンプレは後述）
  - `allowed_roles`（guest/user/admin）
  - `write`かどうか（guest不可にするか）
- [ ] 画面（routeKey）一覧を抽出
- [ ] 各画面が参照するAPI一覧を紐付ける

---

### Phase 1: バックエンド認証強化

**方針:**
- 公開APIが混在していて401が大量発生しているので統一する
- すべての業務APIは `get_current_user` に寄せる
- `require_role()` / `require_write_permission()` を導入

**チェックリスト:**
- [ ] `get_current_user_optional` を使っている業務エンドポイントを列挙
- [ ] 列挙した業務エンドポイントをすべて `get_current_user` に置換（原則1）
- [ ] `require_role(allowed_roles)` を実装（共通依存関数）
- [ ] `require_write_permission()` を実装（ゲストは403）
- [ ] すべてのエンドポイントに以下のどちらかを必ず付与
  - **READ系:** `require_role(["guest","user","admin"])` など
  - **WRITE系:** `require_role(["user","admin"])` or `require_write_permission()`
- [ ] ゲスト許可APIが仕様通りか確認
  - ✅ ダッシュボード、在庫、ロット（読み取り）
  - ❌ 受注、マスタ、設定、編集・削除全般

**実装例:**

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
```

**適用例:**

```python
# READ系（ゲスト可）
@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["guest", "user", "admin"])),
):
    ...

# WRITE系（ゲスト不可）
@router.post("/orders")
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_permission()),
):
    ...

# ADMIN専用
@router.post("/settings/reset")
def reset_settings(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin"])),
):
    ...
```

---

### Phase 2: フロントエンド権限管理

**狙い:** ゲスト権限は固定、一般ユーザーは設定で制御、管理者は常にOK。

**チェックリスト:**
- [ ] `GUEST_PERMISSIONS` を定義（固定権限）
- [ ] `AccessGuard` を更新
  - guest: 固定権限で判定
  - user: `usePermission({ routeKey })`（設定で判定）
- [ ] システム設定UIから「ゲスト」列を削除（ゲスト権限は変更不可の文言追加）
- [ ] APIクライアントを統一：ログイン以外は `httpAuth`

**実装例:**

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

---

### Phase 3: エラーハンドリング改善

**目的:** 401/403をユーザーに分かる形にする。

**チェックリスト:**
- [ ] 401: ログイン誘導（または方式Aならguestトークン再取得→再試行）
- [ ] 403: 権限不足メッセージを表示
- [ ] ゲスト向けに「ログインしてください」導線を用意

**実装例:**

```typescript
// frontend/src/shared/api/http-client.ts

function handleUnauthorizedError(request: Request, errorMessage: string): void {
  if (!isLoginEndpoint(request?.url)) {
    // 方式Aの場合: ゲストトークンを再取得して再試行
    // 方式Bの場合: ログインページへリダイレクト
    dispatchAuthError(errorMessage || "セッションの有効期限が切れました");
  }
}

function handleForbiddenError(request: Request, errorMessage: string): void {
  if (!isLoginEndpoint(request?.url)) {
    dispatchForbiddenError(errorMessage || "この操作を行う権限がありません");
  }
}
```

---

## 棚卸しテンプレート

### API分類シート

この表を埋めるだけで、`require_role` の付与が機械的になります。

| router file | method | path | 種別 | allowed roles | write? | 付ける依存 | 備考 |
|------------|--------|------|------|---------------|--------|-----------|------|
| .../dashboard_router.py | GET | /dashboard/stats | READ | guest/user/admin | No | `require_role(["guest","user","admin"])` | ゲスト可（読み取り） |
| .../orders_router.py | POST | /orders | WRITE | user/admin | Yes | `require_write_permission()` | ゲスト不可 |
| .../lots_router.py | POST | /lots | WRITE | user/admin | Yes | `require_write_permission()` | 文書例あり |
| .../inventory_router.py | GET | /inventory | READ | guest/user/admin | No | `require_role(["guest","user","admin"])` | ゲスト可 |
| .../masters_router.py | POST | /masters/customers | WRITE | admin | Yes | `require_role(["admin"])` | 管理者のみ |
| .../settings_router.py | PUT | /settings | WRITE | admin | Yes | `require_role(["admin"])` | 管理者のみ |

**運用ルール（表を埋めるときのコツ）:**
- "READだけどゲスト不可" は基本作らない（例外があるなら備考に理由を書く）
- "WRITEだけどuser不可（adminのみ）" はマスタ/設定だけに寄せる

---

### routeKey 対応表

フロント側の `AccessGuard(routeKey)` と、設定（一般ユーザー向けON/OFF）を繋ぐ表です。

| routeKey | 画面/機能 | guest可? | user設定でOFF可? | admin | 画面が叩くAPI | 備考 |
|----------|----------|---------|-----------------|-------|--------------|------|
| DASHBOARD | ダッシュボード | ✅ | ✅ | 常にOK | `/dashboard/stats`... | ゲストは読み取りのみ |
| INVENTORY | 在庫一覧 | ✅ | ✅ | 常にOK | `/inventory/...` | ゲストは読み取りのみ |
| LOTS | ロット一覧 | ✅ | ✅ | 常にOK | `/lots`(GETのみ) | ゲストは読み取りのみ |
| ORDERS | 受注管理 | ❌ | ✅ | 常にOK | `/orders`... | ゲスト不可 |
| MASTERS | マスタ管理 | ❌ | ❌ | 常にOK | `/masters/...` | user/guestはアクセス不可 |
| SETTINGS | システム設定 | ❌ | ❌ | 常にOK | `/settings`... | user/guestはアクセス不可 |
| RPA | RPA機能 | ❌ | ✅ | 常にOK | `/rpa/...` | ゲスト不可 |
| OCR | OCR結果 | ❌ | ✅ | 常にOK | `/ocr/...` | ゲスト不可 |

---

## 完了条件（Done の定義）

最後にこれで締めると、"401スパム再発" がかなり防げます。

### 機能テスト
- [ ] ゲストでダッシュボード/在庫/ロットを開いて **401が出ない**
- [ ] ゲストで受注/設定へ行くと **UIでブロック**（AccessGuard）
- [ ] ゲストでWRITE系APIを叩くと **403**（バックエンド）
- [ ] `httpPublic` がログイン等の認証不要APIにしか使われていない

### コードレビュー
- [ ] すべての業務APIが `get_current_user` または `require_role()` を使用
- [ ] `get_current_user_optional` は認証不要APIのみ
- [ ] `GUEST_PERMISSIONS` がすべてのゲスト権限をカバーしている
- [ ] システム設定UIに「ゲスト権限は固定」の説明がある

### ドキュメント
- [ ] API分類シートが完成している
- [ ] routeKey対応表が完成している
- [ ] 実装ガイドが最新の状態に更新されている

---

## 次のステップ

実装に入る前に、以下の情報を確認してテンプレートを埋めると作業がスムーズになります:

1. **フロントエンドの routeKey 一覧**: どこにあるか（routes定義のファイル）
2. **バックエンドの router 一覧**: 主要なrouter fileのパス
3. **現在の `get_current_user_optional` 使用箇所**: 置換対象の特定

これらが揃えば、上記のテンプレートに初期入力済みの雛形を作成できます。

---

## 参考資料

- [認証・認可システムの再設計提案](./authentication-and-authorization-redesign.md)
- `frontend/src/features/auth/permissions/config.ts` - 現在の権限設定
- `frontend/src/components/auth/AccessGuard.tsx` - アクセスガード実装
- `backend/app/presentation/api/routes/auth/auth_router.py` - 認証ルーター
- `frontend/src/shared/api/http-client.ts` - HTTPクライアント実装
