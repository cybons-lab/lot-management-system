/**
 * AdminGuard.tsx
 *
 * 管理者権限が必要なページのガードコンポーネント
 * adminロールを持たないユーザーはダッシュボードにリダイレクトされる
 *
 * 【設計意図】認証ガードパターンの設計判断:
 *
 * 1. なぜガードコンポーネントが必要なのか
 *    理由: ルーティングレベルでのアクセス制御
 *    セキュリティ要件:
 *    - 管理者専用機能（ユーザー管理、システム設定等）へのアクセスを制限
 *    - 一般ユーザーが管理画面URLに直接アクセスしても、拒否する
 *    実装方針:
 *    - フロントエンドでも認証チェック（UX向上）
 *    - バックエンドでも権限チェック（セキュリティ保証）
 *    → 二重防御（Defense in Depth）
 *
 * 2. useAuth() との連携（L17）
 *    理由: 認証状態を一元管理するコンテキストから取得
 *    取得情報:
 *    - user: ログイン中のユーザー情報（roles配列を含む）
 *    - isLoading: 認証状態の取得中フラグ
 *    メリット:
 *    - 全コンポーネントで一貫した認証状態を参照
 *    - AuthContext が変更されても、ガード側の修正不要
 *
 * 3. ローディング中の処理（L20-22）
 *    理由: 認証状態が確定するまで待つ
 *    問題:
 *    - 初回アクセス時、userデータがまだ取得されていない
 *    → user が null → 誤って「未ログイン」と判定される
 *    → ダッシュボードにリダイレクトされる（バグ）
 *    解決:
 *    - isLoading が true の間は何も表示しない（null を返す）
 *    → userデータ取得完了後に、正しく権限チェック
 *    代替案:
 *    - ローディングスピナー表示: ちらつきが発生（UX低下）
 *    - null 返却: 画面が一瞬空白になるが、すぐに解決（推奨）
 *
 * 4. 権限チェックロジック（L25-26）
 *    理由: ロールベースアクセス制御（RBAC: Role-Based Access Control）
 *    チェック条件:
 *    ```typescript
 *    !user || !user.roles?.includes("admin")
 *    ```
 *    - !user: 未ログインユーザー
 *    - !user.roles?.includes("admin"): ログイン済みだがadminロールなし
 *    → いずれかに該当すれば、リダイレクト
 *    オプショナルチェーン（?.）の使用理由:
 *    - user.roles が undefined でもエラーにならない
 *    → 安全な権限チェック
 *
 * 5. Navigate コンポーネントの使用（L26）
 *    理由: React Router v6 の宣言的リダイレクト
 *    動作:
 *    - <Navigate to="/dashboard" /> → ダッシュボードに遷移
 *    - replace プロパティ: ブラウザ履歴を上書き
 *    replace の意味:
 *    - replace=true: 履歴に残さない
 *    → ユーザーが「戻る」ボタンを押しても、管理画面に戻らない
 *    - replace=false: 履歴に残る
 *    → 「戻る」ボタンで管理画面に戻る → 再度リダイレクト（ループ）
 *    セキュリティ:
 *    - ブラウザ履歴から管理画面URLを隠蔽
 *
 * 6. なぜダッシュボードにリダイレクトするのか
 *    理由: ユーザーフレンドリーな動作
 *    代替案との比較:
 *    - 403エラーページ: 「アクセス拒否」と表示 → ユーザーが困惑
 *    - ログインページ: ログイン済みなのに再ログイン → 混乱
 *    - ダッシュボード: 通常業務に戻れる → 自然な動作
 *    業務シナリオ:
 *    - 営業担当者が誤って管理画面URLをクリック
 *    → ダッシュボードに戻る → 通常業務を続行
 *
 * 7. children の返却（L29）
 *    理由: 権限チェックをパスした場合、通常通りコンポーネントを表示
 *    動作:
 *    - user が存在し、roles に "admin" が含まれる
 *    → children（ラップされたコンポーネント）をそのまま表示
 *    型: React.ReactNode
 *    - あらゆるReact要素を受け入れ可能
 *    → 柔軟なガード適用
 *
 * 8. 使用例
 *    ルート定義:
 *    ```tsx
 *    <Route
 *      path="/admin/users"
 *      element={
 *        <AdminGuard>
 *          <UserManagementPage />
 *        </AdminGuard>
 *      }
 *    />
 *    ```
 *    複数ページでの使用:
 *    ```tsx
 *    <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
 *      <Route path="users" element={<UserManagement />} />
 *      <Route path="settings" element={<SystemSettings />} />
 *    </Route>
 *    ```
 *    → /admin 配下の全ページに一括適用
 *
 * 9. バックエンド側の権限チェックとの連携
 *    フロントエンド:
 *    - AdminGuard で UI レベルの制御
 *    - メリット: 即座にリダイレクト、UX向上
 *    - 制限: ブラウザコンソールで無効化可能（セキュリティ不十分）
 *    バックエンド:
 *    - FastAPI の Depends(require_admin) で API レベルの制御
 *    - メリット: 確実な権限チェック（回避不可能）
 *    → 両方を実装することで、UXとセキュリティを両立
 *
 * 10. 将来的な拡張の方向性
 *     検討中の機能:
 *     - RoleGuard: 任意のロールでガード可能に
 *       ```tsx
 *       <RoleGuard roles={["admin", "manager"]}>
 *         <SensitivePage />
 *       </RoleGuard>
 *       ```
 *     - PermissionGuard: より細かい権限制御
 *       ```tsx
 *       <PermissionGuard permissions={["user:write"]}>
 *         <EditUserForm />
 *       </PermissionGuard>
 *       ```
 *     - カスタムリダイレクト先: ページごとに異なるリダイレクト先を指定
 */

import { Navigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();

  // ローディング中は何も表示しない
  if (isLoading) {
    return null;
  }

  // 未ログインまたは管理者権限がない場合はリダイレクト
  if (!user || !user.roles?.includes("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
