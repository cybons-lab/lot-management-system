/**
 * useCustomerItemsPage - Custom hook for customer items page logic.
 */
/* eslint-disable max-lines-per-function */
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
    product_id: "",
  });
  const [showInactive, setShowInactive] = useState(false);

  const queryParams = useMemo(
    () => ({
      customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
      product_id: filters.product_id ? Number(filters.product_id) : undefined,
      include_inactive: showInactive,
    }),
    [filters.customer_id, filters.product_id, showInactive],
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

  const { mutate: softDelete, isPending: isSoftDeleting } = useDeleteCustomerItem();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } =
    usePermanentDeleteCustomerItem();
  const { mutate: restore, isPending: isRestoring } = useRestoreCustomerItem();

  // Filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return customerItems;

    const query = searchQuery.toLowerCase();
    return customerItems.filter(
      (item) =>
        item.external_product_code.toLowerCase().includes(query) ||
        item.customer_id.toString().includes(query) ||
        item.product_id.toString().includes(query),
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

  // Soft Delete Handler
  const handleSoftDelete = useCallback(
    (customerId: number, externalProductCode: string, endDate?: string) => {
      softDelete(
        { customerId, externalProductCode, endDate },
        {
          onSuccess: () => toast.success("得意先品番マッピングを削除しました"),
          onError: () => toast.error("削除に失敗しました"),
        },
      );
    },
    [softDelete],
  );

  // Permanent Delete Handler
  const handlePermanentDelete = useCallback(
    (customerId: number, externalProductCode: string) => {
      permanentDelete(
        { customerId, externalProductCode },
        {
          onSuccess: () => toast.success("完全に削除しました"),
          onError: () => toast.error("完全削除に失敗しました"),
        },
      );
    },
    [permanentDelete],
  );

  // Restore Handler
  const handleRestore = useCallback(
    (customerId: number, externalProductCode: string) => {
      restore(
        { customerId, externalProductCode },
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
    stats,
    // Handlers
    handleCreate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
  };
}
