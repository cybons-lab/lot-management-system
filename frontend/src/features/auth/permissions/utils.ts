/**
 * RBAC 権限チェックユーティリティ
 *
 * 【デフォルトdeny方針】
 * - 未定義ルートは自動的に拒否（Forbidden）
 * - 新規ページ追加時に権限設定を忘れると、アクセス不可になる
 * - これにより、権限漏れを防止
 */

import { operationPermissions, routePermissions, tabPermissions } from "./config";
import type { RoleCode, RoutePermissionResult } from "./types";

/**
 * 指定パスに対する権限情報を取得
 *
 * @param path URLパス（例: "/orders", "/admin"）
 * @returns 権限チェック結果（isDefined が false の場合は未定義ルート → deny）
 */
export function getRoutePermission(path: string): RoutePermissionResult {
  // 完全一致を先に探す
  const exactMatch = routePermissions.find((p) => p.path === path);
  if (exactMatch) {
    return { allowedRoles: exactMatch.allowedRoles, isDefined: true };
  }

  // パスパラメータ (:) や ワイルドカード (*) を含むルートをマッチング
  for (const permission of routePermissions) {
    if (permission.path.includes(":") || permission.path.includes("*")) {
      // 1. :param -> [^/]+ (パラメータ名は英数字とアンダースコア)
      // 2. * -> .* (ワイルドカード)
      const pattern = permission.path.replace(/:\w+/g, "[^/]+").replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return { allowedRoles: permission.allowedRoles, isDefined: true };
      }
    }
  }

  // 未定義ルート → デフォルトdeny
  return { allowedRoles: null, isDefined: false };
}

/**
 * routeKeyに対する権限情報を取得
 *
 * @param routeKey ルートキー（例: "ORDERS.LIST", "ADMIN.INDEX"）
 * @returns 権限チェック結果（isDefined が false の場合は未定義routeKey → deny）
 */
export function getRoutePermissionByKey(routeKey: string): RoutePermissionResult {
  const permission = routePermissions.find((p) => p.routeKey === routeKey);
  if (permission) {
    return { allowedRoles: permission.allowedRoles, isDefined: true };
  }
  // 未定義routeKey → デフォルトdeny
  return { allowedRoles: null, isDefined: false };
}

/**
 * 指定パスに対する許可ロールを取得
 *
 * @param path URLパス（例: "/orders", "/admin"）
 * @returns 許可されたロールの配列（未定義ルートは空配列 = deny）
 */
export function getRouteAllowedRoles(path: string): RoleCode[] {
  const result = getRoutePermission(path);
  // 未定義ルートは空配列 = 誰もアクセス不可
  return result.allowedRoles ?? [];
}

/**
 * routeKeyに対する許可ロールを取得
 *
 * @param routeKey ルートキー（例: "ORDERS.LIST", "ADMIN.INDEX"）
 * @returns 許可されたロールの配列（未定義routeKeyは空配列 = deny）
 */
export function getRouteAllowedRolesByKey(routeKey: string): RoleCode[] {
  const result = getRoutePermissionByKey(routeKey);
  // 未定義routeKeyは空配列 = 誰もアクセス不可
  return result.allowedRoles ?? [];
}

/**
 * ルートが明示的に定義されているか確認
 *
 * @param path URLパス
 * @returns 定義されている場合true
 */
export function isRouteDefined(path: string): boolean {
  return getRoutePermission(path).isDefined;
}

/**
 * routeKeyが明示的に定義されているか確認
 *
 * @param routeKey ルートキー
 * @returns 定義されている場合true
 */
export function isRouteKeyDefined(routeKey: string): boolean {
  return getRoutePermissionByKey(routeKey).isDefined;
}

/**
 * タブに対する許可ロールを取得
 *
 * @param routeKey 親ルートのキー
 * @param tabKey タブのキー
 * @returns 許可されたロールの配列（未定義タブは空配列 = deny）
 */
export function getTabAllowedRoles(routeKey: string, tabKey: string): RoleCode[] {
  const permission = tabPermissions.find((p) => p.routeKey === routeKey && p.tabKey === tabKey);
  if (permission) {
    return permission.allowedRoles;
  }
  // 未定義タブ → デフォルトdeny（空配列）
  return [];
}

/**
 * 操作に対する許可ロールを取得
 *
 * @param operationKey 操作キー（例: "inventory:create", "order:delete"）
 * @returns 許可されたロールの配列（未定義操作は空配列 = deny）
 */
export function getOperationAllowedRoles(operationKey: string): RoleCode[] {
  const permission = operationPermissions.find((p) => p.operationKey === operationKey);
  if (permission) {
    return permission.allowedRoles;
  }
  // 未定義操作 → デフォルトdeny（空配列）
  return [];
}

/**
 * 操作の追加条件を取得
 *
 * @param operationKey 操作キー
 * @returns 追加条件の配列
 */
export function getOperationConditions(operationKey: string): string[] {
  const permission = operationPermissions.find((p) => p.operationKey === operationKey);
  return permission?.additionalConditions ?? [];
}

/**
 * ユーザーが指定されたロールを持っているか確認
 *
 * @param userRoles ユーザーのロール配列
 * @param allowedRoles 許可されたロール配列
 * @returns 許可されている場合true
 */
export function hasRequiredRole(userRoles: RoleCode[], allowedRoles: RoleCode[]): boolean {
  // 空配列 = 誰もアクセス不可
  if (allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.some((role) => userRoles.includes(role));
}

/**
 * ユーザーが指定されたパスにアクセスできるか確認
 *
 * @param userRoles ユーザーのロール配列（未ログインの場合は["guest"]）
 * @param path URLパス
 * @returns アクセス可能な場合true
 */
export function canAccessRoute(userRoles: RoleCode[], path: string): boolean {
  const allowedRoles = getRouteAllowedRoles(path);
  return hasRequiredRole(userRoles, allowedRoles);
}

/**
 * ユーザーが指定されたタブにアクセスできるか確認
 *
 * @param userRoles ユーザーのロール配列
 * @param routeKey 親ルートのキー
 * @param tabKey タブのキー
 * @returns アクセス可能な場合true
 */
export function canAccessTab(userRoles: RoleCode[], routeKey: string, tabKey: string): boolean {
  const allowedRoles = getTabAllowedRoles(routeKey, tabKey);
  return hasRequiredRole(userRoles, allowedRoles);
}

/**
 * ユーザーが指定された操作を実行できるか確認
 *
 * @param userRoles ユーザーのロール配列
 * @param operationKey 操作キー
 * @returns 実行可能な場合true
 */
export function canPerformOperation(userRoles: RoleCode[], operationKey: string): boolean {
  const allowedRoles = getOperationAllowedRoles(operationKey);
  return hasRequiredRole(userRoles, allowedRoles);
}

/**
 * 現在のユーザーロールを正規化
 *
 * @param userRoles ユーザーのロール配列（nullやundefinedの場合あり）
 * @returns 正規化されたロール配列（未ログインは["guest"]）
 */
export function normalizeUserRoles(userRoles: string[] | null | undefined): RoleCode[] {
  if (!userRoles || userRoles.length === 0) {
    return ["guest"];
  }
  // 不正なロールをフィルタリング
  return userRoles.filter(
    (role): role is RoleCode => role === "admin" || role === "user" || role === "guest",
  );
}
