# 認証機能のアップグレード（ID・パスワード認証の導入）

現在の「ユーザー選択のみ」の簡易ログインを、IDとパスワードによる正規の認証フローにアップグレードします。

## 現状の課題
- セキュリティ上のリスク：誰でも管理アカウントを含めた任意のユーザーとしてログインできてしまう。
- 本格運用のための準備不足：パスワード認証が実装されていない。

## 変更内容

### [Backend]

#### [NEW] [auth_utils.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/core/auth_utils.py)
- `bcrypt` を使用したパスワードハッシュ化 (`get_password_hash`) および検証 (`verify_password`) のユーティリティを実装します。

#### [MODIFY] [auth_schemas.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/presentation/schemas/auth/auth_schemas.py)
- `LoginRequest` に `password: str` フィールドを追加します。

#### [MODIFY] [auth_router.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/presentation/api/routes/auth/auth_router.py)
- `login` エンドポイントを修正：
  - `username` と `password` を受け取るように変更。
  - 対象ユーザーが `admin` ロールを持つ場合のみ、パスワードの検証を必須とします。
  - 一般ユーザー（`user`, `guest`）は、移行期間の間、パスワードなしでのログインを許可します（テスト効率のため）。

#### [NEW] [set_admin_passwords.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/scripts/set_admin_passwords.py)
- 管理者ユーザー（`admin` ロール保持者）に対して、初期パスワード（例: `admin123`）を設定するためのスクリプトを作成・実行します。

### [Frontend]

#### [MODIFY] [LoginPage.tsx](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/features/auth/pages/LoginPage.tsx)
- ハイブリッドなログインUIへと変更：
  - ユーザー選択ドロップダウンは維持します。
  - 選択されたユーザーが `admin` ロールを持つ場合のみ、パスワード入力フィールドを動的に表示します。
  - 一般ユーザー選択時は、従来通りボタンのみでログイン可能です。

#### [MODIFY] [AuthContext.tsx](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/features/auth/AuthContext.tsx)
- `login` 関数のシグネチャを `(username: string, password: string)` に変更し、APIへ送信するように修正します。

## 検証プラン

### Automated Tests
- バックエンドの `auth_utils` の単体テストを実施。
- パスワード一致・不一致によるログイン成功/失敗のテスト。

### Manual Verification
1. 初期パスワード設定スクリプトを実行。
2. ログイン画面で正しいユーザーIDとパスワードを入力し、ログインできることを確認。
3. 誤ったパスワードでログインが拒否されることを確認。
4. ログイン後、従来通り権限に基づいたアクセス制御が効いていることを確認。
