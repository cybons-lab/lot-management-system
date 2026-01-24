/**
 * RBAC (Role-Based Access Control) 型定義
 *
 * 【設計意図】
 * - admin/user/guest の3段階ロールで権限を管理
 * - guest = 未ログイン状態
 * - ルート（URL）、タブ、操作の3レベルで制御
 */

/**
 * ロールコード
 * - admin: 管理者（全機能アクセス可能）
 * - user: 一般ユーザー（業務機能アクセス可能）
 * - guest: 未ログイン（閲覧のみ、一部ページのみアクセス可能）
 */
export type RoleCode = "admin" | "user" | "guest";

/**
 * ルート権限チェック結果
 *
 * 【デフォルトdeny方針】
 * 未定義ルートは isDefined=false を返し、AccessGuard で deny される
 */
export interface RoutePermissionResult {
  /** 許可されたロール（未定義ルートはnull） */
  allowedRoles: RoleCode[] | null;
  /** ルートが明示的に定義されているか */
  isDefined: boolean;
}

/**
 * ルート権限設定
 */
export interface RoutePermission {
  /** ルートの一意識別子（ROUTES定数のキー） */
  routeKey: string;
  /** URLパス */
  path: string;
  /** アクセス可能なロール */
  allowedRoles: RoleCode[];
  /** アクセス拒否時のリダイレクト先（省略時: /login または /forbidden） */
  redirectOnDeny?: string;
}

/**
 * タブ権限設定
 */
export interface TabPermission {
  /** 親ルートのキー */
  routeKey: string;
  /** タブの一意識別子 */
  tabKey: string;
  /** アクセス可能なロール */
  allowedRoles: RoleCode[];
}

/**
 * 操作権限設定
 */
export interface OperationPermission {
  /** 操作の一意識別子（例: "inventory:create", "order:delete"） */
  operationKey: string;
  /** 実行可能なロール */
  allowedRoles: RoleCode[];
  /** 追加条件（例: "noRelatedData", "within5minutes"） */
  additionalConditions?: string[];
}

/**
 * 権限設定全体
 */
export interface PermissionConfig {
  routes: RoutePermission[];
  tabs: TabPermission[];
  operations: OperationPermission[];
}

/**
 * adminHardDelete条件設定
 */
export interface HardDeleteConditions {
  /** 外部キー参照がゼロであることを要求 */
  requireNoRelatedData: boolean;
  /** 作成後の最大経過時間（分） */
  maxAgeMinutes: number;
}
