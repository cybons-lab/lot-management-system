import { useState, useCallback } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { useListPageDialogs, useTable } from "@/hooks/ui";
import { logInfo } from "@/services/error-logger";
import { type SortConfig } from "@/shared/components/data/DataTable";

interface MasterListPageOptions<T> {
  defaultSort: SortConfig;
  filterFn: (items: T[], query: string) => T[];
  sortFn: (items: T[], sort: SortConfig) => T[];
  getRowId: (item: T) => string | number;
  featureName: string; // ロギング用
}

/**
 * マスタ一覧ページの基幹ロジック（表示・選択・操作）を統合管理する汎用フック
 */
export function useMasterListPage<T extends { version: number }>({
  defaultSort,
  filterFn,
  sortFn,
  getRowId,
  featureName,
}: MasterListPageOptions<T>) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;

  // -- States --
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>(defaultSort);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // -- Base Hooks --
  const table = useTable({ initialPageSize: 25 });
  const dlgs = useListPageDialogs<T>();

  // -- Logging Helpers --
  const log = useCallback(
    (msg: string, context?: Record<string, unknown>) => {
      logInfo(featureName, msg, context);
    },
    [featureName],
  );

  // -- Search Query Handler --
  const handleSearchQueryChange = useCallback(
    (query: string) => {
      log("Search query changed", { query });
      setSearchQuery(query);
    },
    [log],
  );

  // -- Sort Handler --
  const handleSortChange = useCallback(
    (newSort: SortConfig) => {
      log("Sort changed", { newSort });
      setSort(newSort);
    },
    [log],
  );

  // -- Selection Handler --
  const handleSelectionChange = useCallback(
    (ids: (string | number)[]) => {
      log("Selection changed", { count: ids.length, ids });
      setSelectedIds(ids);
    },
    [log],
  );

  // -- Row Click Handler --
  const handleRowClick = useCallback(
    (item: T) => {
      const id = String(getRowId(item));
      log("Row clicked", { id });
      setSelectedItemCode(id);
    },
    [getRowId, log],
  );

  // -- Resources & List Logic --
  // Note: Resource fetching is expected to be passed from the implementation for flexibility
  const processData = useCallback(
    (data: T[] | undefined) => {
      const items = data ?? [];
      const filtered = filterFn(items, searchQuery);
      const sorted = sortFn(filtered, sort);

      return {
        filtered,
        sorted,
        paginated: table.paginateData(sorted),
        pageInfo: table.calculatePagination(sorted.length),
      };
    },
    [filterFn, sortFn, searchQuery, sort, table],
  );

  /**
   * 実行状態を管理しながらバルクアクションを実行する
   */
  const executeBulkWithStatus = async (
    items: T[],
    fn: (p: { id: string | number; version: number }) => Promise<unknown>,
    actionName: string,
  ) => {
    setIsBulkProcessing(true);
    log(`Bulk process started: ${actionName}`, { selectedIds });

    // items を考慮した新しいインスタンスを作成
    const vMap = new Map(items.map((s) => [getRowId(s), s.version]));

    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => {
          const v = vMap.get(id);
          return v != null ? fn({ id, version: v }) : Promise.reject(new Error("no v"));
        }),
      );

      const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
      log(`Bulk process completed: ${actionName}`, {
        success: fulfilledCount,
        total: selectedIds.length,
      });

      const { toast } = await import("sonner");
      toast.success(`${fulfilledCount} 件の${actionName}を完了`);
      setSelectedIds([]);
    } finally {
      setIsBulkProcessing(false);
      setIsBulkOpen(false);
    }
  };

  return {
    // Auth & Permission
    isAdmin,

    // States
    showInactive,
    setShowInactive: (val: boolean) => {
      log("Show inactive toggled", { val });
      setShowInactive(val);
    },
    searchQuery,
    setSearchQuery: handleSearchQueryChange,
    sort,
    setSort: handleSortChange,
    selectedIds,
    setSelectedIds: handleSelectionChange,
    selectedItemCode,
    setSelectedItemCode: (id: string | null) => {
      log("Selected item code changed", { id });
      setSelectedItemCode(id);
    },
    isBulkOpen,
    setIsBulkOpen: (open: boolean) => {
      log("Bulk dialog visiblity changed", { open });
      setIsBulkOpen(open);
    },
    isBulkProcessing,

    // Table & Pagination
    table,

    // Dialogs
    dlgs,

    // Actions
    handleRowClick,
    processData,
    executeBulkWithStatus,

    // Logger
    log,
  };
}
