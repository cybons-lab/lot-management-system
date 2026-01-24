/**
 * ルート権限定義の検証ユーティリティ
 *
 * 【用途】
 * - 開発時にMainRoutesとconfig.tsの整合性をチェック
 * - テスト時に未定義ルートを検出
 *
 * 【使い方】
 * ```typescript
 * import { validateRouteDefinitions, reportUndefinedRoutes } from "./validate-routes";
 *
 * // 定義されたパスのリスト（MainRoutes等から抽出）
 * const actualPaths = ["/dashboard", "/orders", "/admin", ...];
 *
 * // 検証
 * const result = validateRouteDefinitions(actualPaths);
 * if (result.undefinedPaths.length > 0) {
 *   reportUndefinedRoutes(result.undefinedPaths);
 * }
 * ```
 */

import { routePermissions } from "./config";

export interface ValidationResult {
  /** config.tsに定義されていないパス */
  undefinedPaths: string[];
  /** config.tsに定義されているが使われていないパス */
  unusedDefinitions: string[];
  /** 検証に成功したか */
  isValid: boolean;
}

/**
 * 定義されたルートパスのセットを取得
 */
export function getDefinedPaths(): Set<string> {
  return new Set(routePermissions.map((p) => p.path));
}

/**
 * 定義されたrouteKeyのセットを取得
 */
export function getDefinedRouteKeys(): Set<string> {
  return new Set(routePermissions.map((p) => p.routeKey));
}

/**
 * ルート定義の検証
 *
 * @param actualPaths 実際に使用されているパスのリスト
 * @returns 検証結果
 */
export function validateRouteDefinitions(actualPaths: string[]): ValidationResult {
  const definedPaths = getDefinedPaths();
  const undefinedPaths: string[] = [];
  const usedDefinitions = new Set<string>();

  for (const actualPath of actualPaths) {
    // 完全一致チェック
    if (definedPaths.has(actualPath)) {
      usedDefinitions.add(actualPath);
      continue;
    }

    // パラメータ化ルートとのマッチングチェック
    let matched = false;
    for (const definedPath of definedPaths) {
      if (definedPath.includes(":")) {
        const pattern = definedPath.replace(/:[^/]+/g, "[^/]+");
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(actualPath)) {
          usedDefinitions.add(definedPath);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      undefinedPaths.push(actualPath);
    }
  }

  // 使用されていない定義を検出
  const unusedDefinitions = [...definedPaths].filter((p) => !usedDefinitions.has(p));

  return {
    undefinedPaths,
    unusedDefinitions,
    isValid: undefinedPaths.length === 0,
  };
}

/**
 * 未定義ルートをコンソールに報告
 *
 * @param undefinedPaths 未定義パスのリスト
 */
export function reportUndefinedRoutes(undefinedPaths: string[]): void {
  if (undefinedPaths.length === 0) return;

  console.error(
    `\n[RBAC] ${undefinedPaths.length}件の未定義ルートが検出されました:\n` +
      undefinedPaths.map((p) => `  - ${p}`).join("\n") +
      `\n\n→ config.ts の routePermissions に追加してください。\n` +
      `→ デフォルトdeny方針により、これらのルートはForbiddenになります。\n`,
  );
}

/**
 * routeKey の検証
 *
 * @param routeKeys 使用されているrouteKeyのリスト
 * @returns 未定義のrouteKeyリスト
 */
export function validateRouteKeys(routeKeys: string[]): string[] {
  const definedKeys = getDefinedRouteKeys();
  return routeKeys.filter((key) => !definedKeys.has(key));
}

/**
 * 未定義routeKeyをコンソールに報告
 *
 * @param undefinedKeys 未定義routeKeyのリスト
 */
export function reportUndefinedRouteKeys(undefinedKeys: string[]): void {
  if (undefinedKeys.length === 0) return;

  console.error(
    `\n[RBAC] ${undefinedKeys.length}件の未定義routeKeyが検出されました:\n` +
      undefinedKeys.map((k) => `  - ${k}`).join("\n") +
      `\n\n→ config.ts の routePermissions に追加してください。\n`,
  );
}
