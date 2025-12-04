/**
 * useCustomerItemsPage - Custom hook for customer items page logic.
 */
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

import type { CreateCustomerItemRequest } from "../api";
import { useCustomerItems, useCreateCustomerItem, useDeleteCustomerItem } from "../hooks";

// eslint-disable-next-line max-lines-per-function
export function useCustomerItemsPage() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    customer_id: "",
    product_id: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Build query params
  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
  };

  // Data
  const { data: customerItems = [], isLoading } = useCustomerItems(queryParams);
  const { mutate: createCustomerItem, isPending: isCreating } = useCreateCustomerItem();
  const { mutate: deleteCustomerItem, isPending: isDeleting } = useDeleteCustomerItem();

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
    [createCustomerItem],
  );

  // Delete handler
  const handleDelete = useCallback(
    (customerId: number, externalProductCode: string) => {
      if (!confirm("この得意先品番マッピングを削除してもよろしいですか？")) {
        return;
      }

      deleteCustomerItem(
        { customerId, externalProductCode },
        {
          onSuccess: () => {
            toast.success("得意先品番マッピングを削除しました");
          },
          onError: () => {
            toast.error("削除に失敗しました");
          },
        },
      );
    },
    [deleteCustomerItem],
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
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    // Data
    filteredItems,
    isLoading,
    isCreating,
    isDeleting,
    stats,
    // Handlers
    handleCreate,
    handleDelete,
  };
}
