/**
 * RBAC (Role-Based Access Control) モジュール
 *
 * @example
 * ```typescript
 * import { canAccessRoute, canPerformOperation, normalizeUserRoles } from "@/features/auth/permissions";
 *
 * const userRoles = normalizeUserRoles(user?.roles);
 * if (canAccessRoute(userRoles, "/admin")) {
 *   // 管理画面にアクセス可能
 * }
 * ```
 */

// Types
export type {
  HardDeleteConditions,
  OperationPermission,
  PermissionConfig,
  RoleCode,
  RoutePermission,
  RoutePermissionResult,
  TabPermission,
} from "./types";

// Config
export {
  hardDeleteConditions,
  operationPermissions,
  permissionConfig,
  routePermissions,
  tabPermissions,
} from "./config";

// Utils
export {
  canAccessRoute,
  canAccessTab,
  canPerformOperation,
  getOperationAllowedRoles,
  getOperationConditions,
  getRouteAllowedRoles,
  getRouteAllowedRolesByKey,
  getRoutePermission,
  getRoutePermissionByKey,
  getTabAllowedRoles,
  hasRequiredRole,
  isRouteDefined,
  isRouteKeyDefined,
  normalizeUserRoles,
} from "./utils";

// Validation (for dev/test)
export {
  getDefinedPaths,
  getDefinedRouteKeys,
  reportUndefinedRouteKeys,
  reportUndefinedRoutes,
  validateRouteDefinitions,
  validateRouteKeys,
  type ValidationResult,
} from "./validate-routes";
