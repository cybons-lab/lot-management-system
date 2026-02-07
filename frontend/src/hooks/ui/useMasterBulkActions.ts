import { toast } from "sonner";

import { logInfo, logWarning } from "@/services/error-logger";

interface BulkActionParams {
  id: string | number;
  version: number;
}

/**
 * マスタ一覧の一括操作を共通管理するカスタムフック
 */
export function useMasterBulkActions<T extends { version: number }>(
  items: T[],
  selectedIds: (string | number)[],
  setSelectedIds: (ids: (string | number)[]) => void,
  getId: (item: T) => string | number,
) {
  /**
   * 指定した変異関数を選択された全アイテムに対して実行する
   */
  const executeBulk = async (
    fn: (p: BulkActionParams) => Promise<unknown>,
    actionName: string,
  ) => {
    logInfo("BulkAction", `Start "${actionName}" for ${selectedIds.length} items`, {
      selectedIds,
    });

    // ID からバージョンを取得するためのマップを作成
    const versionMap = new Map(items.map((item) => [getId(item), item.version]));

    const results = await Promise.allSettled(
      selectedIds.map((id) => {
        const version = versionMap.get(id);
        if (version === undefined) {
          logWarning("BulkAction", `Version not found for ID: ${id}`);
          return Promise.reject(new Error(`Version not found for ID: ${id}`));
        }

        logInfo("BulkAction", `Executing for ID: ${id}, Version: ${version}`);
        return fn({ id, version });
      }),
    );

    const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
    const rejectedCount = results.filter((r) => r.status === "rejected").length;

    logInfo("BulkAction", `Completed "${actionName}"`, {
      total: selectedIds.length,
      success: fulfilledCount,
      failure: rejectedCount,
    });

    if (fulfilledCount > 0) {
      toast.success(`${fulfilledCount} 件の${actionName}を完了しました`);
    }

    if (rejectedCount > 0) {
      toast.error(`${rejectedCount} 件の${actionName}に失敗しました`);
    }

    // 成功したアイテムがある場合は選択解除
    if (fulfilledCount > 0) {
      setSelectedIds([]);
    }
  };

  return { executeBulk };
}
