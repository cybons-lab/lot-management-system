/**
 * useCustomerItemsPage - Custom hook for customer items page logic.
 *
 * Updated: サロゲートキー（id）ベースに移行
 * - ID-based operations
 * - customer_part_no for filtering
 */
/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

import type { CreateCustomerItemRequest } from "../api";
import {
  useCustomerItems,
  useCreateCustomerItem,
  useDeleteCustomerItem,
  usePermanentDeleteCustomerItem,
  useRestoreCustomerItem,
} from "../hooks";

function useCustomerItemFilters() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    customer_id: "",
  });
  const [showInactive, setShowInactive] = useState(false);

  const queryParams = useMemo(
    () => ({
      customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
      include_inactive: showInactive,
    }),
    [filters.customer_id, showInactive],
  );

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showInactive,
    setShowInactive,
    queryParams,
  };
}

function useCustomerItemDialogs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  return { isCreateDialogOpen, setIsCreateDialogOpen, isImportDialogOpen, setIsImportDialogOpen };
}

export function useCustomerItemsPage() {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showInactive,
    setShowInactive,
    queryParams,
  } = useCustomerItemFilters();

  const { isCreateDialogOpen, setIsCreateDialogOpen, isImportDialogOpen, setIsImportDialogOpen } =
    useCustomerItemDialogs();

  const { data: customerItems = [], isLoading } = useCustomerItems(queryParams);
  const { mutate: createCustomerItem, isPending: isCreating } = useCreateCustomerItem();

  const {
    mutate: softDelete,
    mutateAsync: softDeleteAsync,
    isPending: isSoftDeleting,
  } = useDeleteCustomerItem();
  const { mutateAsync: permanentDeleteAsync, isPending: isPermanentDeleting } =
    usePermanentDeleteCustomerItem();
  const { mutate: restore, isPending: isRestoring } = useRestoreCustomerItem();

  // 一括削除の状態管理
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return customerItems;

    const query = searchQuery.toLowerCase();
    return customerItems.filter(
      (item) =>
        item.customer_part_no.toLowerCase().includes(query) ||
        item.customer_id.toString().includes(query) ||
        item.maker_part_no?.toLowerCase().includes(query) ||
        item.display_name?.toLowerCase().includes(query),
    );
  }, [customerItems, searchQuery]);

  // Create handler
  const handleCreate = useCallback(
    (data: CreateCustomerItemRequest) => {
      createCustomerItem(data, {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          toast.success("得意先品番マッピングを登録しました");
        },
        onError: () => {
          toast.error("登録に失敗しました。既に同じマッピングが存在する可能性があります。");
        },
      });
    },
    [createCustomerItem, setIsCreateDialogOpen],
  );

  // Soft Delete Handler (ID-based)
  const handleSoftDelete = useCallback(
    (id: number, version: number, endDate?: string) => {
      softDelete(
        { id, version, endDate },
        {
          onSuccess: () => toast.success("得意先品番マッピングを削除しました"),
          onError: () => toast.error("削除に失敗しました"),
        },
      );
    },
    [softDelete],
  );

  // Permanent Delete Handler (ID-based)
  const handlePermanentDelete = useCallback(
    (id: number, version: number) => {
      permanentDeleteAsync(
        { id, version },
        {
          onSuccess: () => toast.success("完全に削除しました"),
          onError: () => toast.error("完全削除に失敗しました"),
        },
      );
    },
    [permanentDeleteAsync],
  );

  // Bulk Permanent Delete Handler (ID-based)
  const handleBulkPermanentDelete = useCallback(
    async (items: { id: number; version: number }[]) => {
      if (items.length === 0) return;

      setIsBulkDeleting(true);
      try {
        const results = await Promise.allSettled(
          items.map((item) => permanentDeleteAsync({ id: item.id, version: item.version })),
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (failed === 0) {
          toast.success(`${succeeded} 件を完全に削除しました`);
        } else if (succeeded === 0) {
          toast.error(`${failed} 件の削除に失敗しました`);
        } else {
          toast.warning(`${succeeded} 件を削除、${failed} 件が失敗しました`);
        }
      } finally {
        setIsBulkDeleting(false);
      }
    },
    [permanentDeleteAsync],
  );

  // Bulk Soft Delete Handler (ID-based)
  const handleBulkSoftDelete = useCallback(
    async (items: { id: number; version: number }[], endDate?: string) => {
      if (items.length === 0) return;

      setIsBulkDeleting(true);
      try {
        const results = await Promise.allSettled(
          items.map((item) => softDeleteAsync({ id: item.id, version: item.version, endDate })),
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (failed === 0) {
          toast.success(`${succeeded} 件を無効化しました`);
        } else if (succeeded === 0) {
          toast.error(`${failed} 件の無効化に失敗しました`);
        } else {
          toast.warning(`${succeeded} 件を無効化、${failed} 件が失敗しました`);
        }
      } finally {
        setIsBulkDeleting(false);
      }
    },
    [softDeleteAsync],
  );

  // Restore Handler (ID-based)
  const handleRestore = useCallback(
    (id: number) => {
      restore(
        { id },
        {
          onSuccess: () => toast.success("復元しました"),
          onError: () => toast.error("復元に失敗しました"),
        },
      );
    },
    [restore],
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: customerItems.length,
      filtered: filteredItems.length,
    }),
    [customerItems.length, filteredItems.length],
  );

  return {
    // State
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showInactive,
    setShowInactive,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    // Data
    filteredItems,
    isLoading,
    isCreating,
    isSoftDeleting,
    isPermanentDeleting,
    isRestoring,
    isBulkDeleting,
    stats,
    // Handlers
    handleCreate,
    handleSoftDelete,
    handlePermanentDelete,
    handleBulkPermanentDelete,
    handleBulkSoftDelete,
    handleRestore,
  };
}
