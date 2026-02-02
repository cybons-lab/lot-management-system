/**
 * ゲストユーザーの固定権限定義
 *
 * システム設定では変更不可のハードコーディングされた権限。
 * 方式A（すべてのユーザーを認証済みとして扱う）の実装の一部。
 *
 * **設計原則:**
 * - ゲストは読み取り専用（すべての編集・削除操作は不可）
 * - 限定的なページのみアクセス可能（ダッシュボード、在庫、ロット）
 * - 受注管理・マスタ管理・システム設定は完全にブロック
 */

export const GUEST_PERMISSIONS = {
  // ========================================
  // ページアクセス権限
  // ========================================
  canAccessDashboard: true, // ダッシュボード（統計閲覧のみ）
  canAccessInventory: true, // 在庫一覧（閲覧のみ）
  canAccessLots: true, // ロット一覧（閲覧のみ）
  canAccessOrders: false, // 受注管理（アクセス不可）
  canAccessMasters: false, // マスタ管理（アクセス不可）
  canAccessSettings: false, // システム設定（アクセス不可）
  canAccessRPA: false, // RPA機能（アクセス不可）
  canAccessOCR: false, // OCR結果（アクセス不可）
  canAccessForecasts: false, // フォーキャスト（アクセス不可）
  canAccessInboundPlans: false, // 入荷予定（アクセス不可）
  canAccessCalendar: false, // カレンダー（アクセス不可）
  canAccessAdmin: false, // 管理機能（アクセス不可）

  // ========================================
  // 操作権限
  // ========================================
  canCreate: false, // 新規作成（すべて不可）
  canUpdate: false, // 更新（すべて不可）
  canDelete: false, // 削除（すべて不可）
  canExport: true, // エクスポート（読み取り専用のため可能）
  canImport: false, // インポート（不可）

  // ========================================
  // 在庫操作権限
  // ========================================
  canCreateLot: false, // ロット作成（不可）
  canUpdateLot: false, // ロット更新（不可）
  canDeleteLot: false, // ロット削除（不可）
  canMoveLot: false, // 在庫移動（不可）
  canAdjustInventory: false, // 在庫調整（不可）
  canWithdrawInventory: false, // 出庫（不可）

  // ========================================
  // 受注操作権限
  // ========================================
  canCreateOrder: false, // 受注作成（不可）
  canUpdateOrder: false, // 受注更新（不可）
  canCancelOrder: false, // 受注キャンセル（不可）
  canAllocateOrder: false, // 引当（不可）

  // ========================================
  // マスタ操作権限
  // ========================================
  canCreateMaster: false, // マスタ作成（不可）
  canUpdateMaster: false, // マスタ更新（不可）
  canDeleteMaster: false, // マスタ削除（不可）
  canBulkLoadMaster: false, // 一括登録（不可）
} as const;

export type GuestPermissionKey = keyof typeof GUEST_PERMISSIONS;

/**
 * Check if guest user has permission for a specific action.
 *
 * @param permissionKey - The permission key to check
 * @returns true if guest has permission, false otherwise
 */
export function checkGuestPermission(permissionKey: GuestPermissionKey): boolean {
  return GUEST_PERMISSIONS[permissionKey];
}

/**
 * Check if user is guest by checking roles.
 *
 * @param roles - User's role array
 * @returns true if user has 'guest' role
 */
export function isGuestUser(roles: string[] | undefined): boolean {
  return roles?.includes("guest") ?? false;
}
