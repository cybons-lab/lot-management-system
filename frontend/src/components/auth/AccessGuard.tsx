import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import {
  getRoutePermission,
  getRoutePermissionByKey,
  normalizeUserRoles,
  type RoleCode,
  type RoutePermissionResult,
} from "@/features/auth/permissions";

interface AccessGuardProps {
  children: React.ReactNode;
  /** 直接指定するロール配列（レガシー互換） */
  roles?: RoleCode[];
  /** 権限設定から自動取得するためのルートキー */
  routeKey?: string;
  /** アクセス拒否時のカスタムリダイレクト先 */
  fallbackPath?: string;
}

/**
 * 許可ロールと定義状態を解決する
 */
function resolvePermission(
  roles: RoleCode[] | undefined,
  routeKey: string | undefined,
  pathname: string,
): { allowedRoles: RoleCode[]; isDefined: boolean } {
  // roles直接指定 = 明示的に定義されている
  if (roles) {
    return { allowedRoles: roles, isDefined: true };
  }

  // routeKey指定 → config.tsから取得
  if (routeKey) {
    const result = getRoutePermissionByKey(routeKey);
    warnIfUndefined(result, `routeKey: "${routeKey}"`);
    return { allowedRoles: result.allowedRoles ?? [], isDefined: result.isDefined };
  }

  // パスから自動判定
  const result = getRoutePermission(pathname);
  warnIfUndefined(result, `パス: "${pathname}"`);
  return { allowedRoles: result.allowedRoles ?? [], isDefined: result.isDefined };
}

/**
 * 開発環境で未定義ルートの警告を出す
 */
function warnIfUndefined(result: RoutePermissionResult, identifier: string): void {
  if (!result.isDefined && import.meta.env.DEV) {
    console.warn(
      `[AccessGuard] 未定義${identifier}\n` +
        `→ config.ts の routePermissions に追加してください。\n` +
        `→ デフォルトdeny方針により、このルートはForbiddenになります。`,
    );
  }
}

/**
 * ルートアクセスガード
 *
 * 【デフォルトdeny方針】
 * - 未定義ルート（config.tsに登録されていない）はForbiddenになる
 * - 新規ページ追加時は必ずconfig.tsに権限を追加すること
 * - 開発環境では未定義ルートの警告がコンソールに表示される
 *
 * 【使い方】
 * 1. roles を直接指定（レガシー互換）
 *    <AccessGuard roles={["admin", "user"]}><Page /></AccessGuard>
 *
 * 2. routeKey を指定して権限設定から自動取得
 *    <AccessGuard routeKey="ADMIN.INDEX"><AdminPage /></AccessGuard>
 *
 * 3. 両方指定しない場合は現在のパスから自動判定
 *    <AccessGuard><Page /></AccessGuard>
 */
export function AccessGuard({ children, roles, routeKey, fallbackPath }: AccessGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 認証状態読み込み中は何も表示しない
  if (isLoading) {
    return null;
  }

  // 現在のユーザーロール（未ログイン = ["guest"]）
  const currentRoles = normalizeUserRoles(user?.roles);

  // 許可ロールの決定
  const { allowedRoles } = resolvePermission(roles, routeKey, location.pathname);

  // 権限チェック（空配列 = 誰もアクセス不可）
  const isAllowed =
    allowedRoles.length > 0 && allowedRoles.some((role) => currentRoles.includes(role));

  if (!isAllowed) {
    // 未ログインでguestが許可されていない → ログインへ（returnTo付き）
    if (!user && !allowedRoles.includes("guest")) {
      const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
      return <Navigate to={`/login?returnTo=${returnTo}`} replace state={{ from: location }} />;
    }
    // ログイン済みだが権限不足、または未定義ルート → forbiddenページ
    return <Navigate to={fallbackPath ?? "/forbidden"} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
