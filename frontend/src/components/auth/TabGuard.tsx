/**
 * TabGuard - タブ単位のアクセス制御
 *
 * 【使い方】
 * 1. コンポーネントでタブをラップ
 *    <TabGuard routeKey="INVENTORY.ROOT" tabKey="adjustments">
 *      <AdjustmentsContent />
 *    </TabGuard>
 *
 * 2. フック版でタブ表示/非表示を制御
 *    const canViewAdjustments = useTabPermission("INVENTORY.ROOT", "adjustments");
 *    {canViewAdjustments && <TabsTrigger value="adjustments">調整</TabsTrigger>}
 */

import { useAuth } from "@/features/auth/AuthContext";
import { canAccessTab, normalizeUserRoles } from "@/features/auth/permissions";

interface TabGuardProps {
  children: React.ReactNode;
  /** 親ルートのキー */
  routeKey: string;
  /** タブのキー */
  tabKey: string;
  /** 権限なし時の代替表示 */
  fallback?: React.ReactNode;
}

/**
 * タブガードコンポーネント
 */
export function TabGuard({ children, routeKey, tabKey, fallback = null }: TabGuardProps) {
  const isAllowed = useTabPermission(routeKey, tabKey);
  return isAllowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * タブ権限チェックフック
 *
 * @param routeKey 親ルートのキー
 * @param tabKey タブのキー
 * @returns アクセス可能な場合true
 */
export function useTabPermission(routeKey: string, tabKey: string): boolean {
  const { user } = useAuth();
  const currentRoles = normalizeUserRoles(user?.roles);
  return canAccessTab(currentRoles, routeKey, tabKey);
}

/**
 * 複数タブの権限を一括チェックするフック
 *
 * @param routeKey 親ルートのキー
 * @param tabKeys チェックするタブキーの配列
 * @returns タブキーをキー、アクセス可否を値としたオブジェクト
 *
 * @example
 * const tabPermissions = useTabPermissions("INVENTORY.ROOT", ["summary", "adjustments", "history"]);
 * // { summary: true, adjustments: false, history: false }
 */
export function useTabPermissions(routeKey: string, tabKeys: string[]): Record<string, boolean> {
  const { user } = useAuth();
  const currentRoles = normalizeUserRoles(user?.roles);

  return tabKeys.reduce(
    (acc, tabKey) => {
      acc[tabKey] = canAccessTab(currentRoles, routeKey, tabKey);
      return acc;
    },
    {} as Record<string, boolean>,
  );
}
