/**
 * OperationGuard - 操作単位のアクセス制御
 *
 * 【使い方】
 * 1. コンポーネントで操作ボタンをラップ
 *    <OperationGuard operationKey="inventory:delete">
 *      <Button onClick={handleDelete}>削除</Button>
 *    </OperationGuard>
 *
 * 2. フック版で条件付きレンダリング
 *    const canDelete = useOperationPermission("inventory:delete");
 *    {canDelete && <Button onClick={handleDelete}>削除</Button>}
 *
 * 3. useCan で複数操作をまとめてチェック
 *    const can = useCan();
 *    {can("inventory:create") && <Button>新規作成</Button>}
 *    {can("inventory:delete") && <Button>削除</Button>}
 */

import { useAuth } from "@/features/auth/AuthContext";
import { canPerformOperation, normalizeUserRoles } from "@/features/auth/permissions";

interface OperationGuardProps {
  children: React.ReactNode;
  /** 操作キー（例: "inventory:create", "order:delete"） */
  operationKey: string;
  /** 権限なし時の代替表示 */
  fallback?: React.ReactNode;
}

/**
 * 操作ガードコンポーネント
 */
export function OperationGuard({ children, operationKey, fallback = null }: OperationGuardProps) {
  const isAllowed = useOperationPermission(operationKey);
  return isAllowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * 操作権限チェックフック
 *
 * @param operationKey 操作キー
 * @returns 実行可能な場合true
 */
export function useOperationPermission(operationKey: string): boolean {
  const { user } = useAuth();
  const currentRoles = normalizeUserRoles(user?.roles);
  return canPerformOperation(currentRoles, operationKey);
}

/**
 * 汎用権限チェック関数を返すフック
 *
 * @returns 操作キーを引数に取り、実行可否を返す関数
 *
 * @example
 * const can = useCan();
 * if (can("inventory:delete")) {
 *   // 削除ボタンを表示
 * }
 */
export function useCan(): (operationKey: string) => boolean {
  const { user } = useAuth();
  const currentRoles = normalizeUserRoles(user?.roles);

  return (operationKey: string): boolean => {
    return canPerformOperation(currentRoles, operationKey);
  };
}

/**
 * 複数操作の権限を一括チェックするフック
 *
 * @param operationKeys チェックする操作キーの配列
 * @returns 操作キーをキー、実行可否を値としたオブジェクト
 *
 * @example
 * const permissions = useOperationPermissions([
 *   "inventory:create",
 *   "inventory:update",
 *   "inventory:delete",
 * ]);
 * // { "inventory:create": true, "inventory:update": true, "inventory:delete": false }
 */
export function useOperationPermissions(operationKeys: string[]): Record<string, boolean> {
  const { user } = useAuth();
  const currentRoles = normalizeUserRoles(user?.roles);

  return operationKeys.reduce(
    (acc, key) => {
      acc[key] = canPerformOperation(currentRoles, key);
      return acc;
    },
    {} as Record<string, boolean>,
  );
}
