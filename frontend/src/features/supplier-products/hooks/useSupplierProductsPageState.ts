/**
 * useSupplierProductsPageState - Page state management hook for SupplierProductsPage
 *
 * Manages:
 * - CRUD operations and mutations
 * - Dialog state (create, edit, delete, restore)
 * - Search, sort, and filter state
 * - Data filtering and sorting logic
 */

import { useState, useMemo, useCallback } from "react";

import type { SupplierProduct, SupplierProductCreate, SupplierProductUpdate } from "../api";
import type { SupplierProductWithValidTo } from "../components/SupplierProductsTable";

import { useSupplierProducts } from "./useSupplierProducts";

import { useProducts } from "@/features/products/hooks/useProducts";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useTable } from "@/hooks/ui";
import type { SortConfig } from "@/shared/components/data/DataTable";

interface DialogState {
  isImportDialogOpen: boolean;
  isCreateDialogOpen: boolean;
  editingItem: SupplierProductWithValidTo | null;
  deletingItem: SupplierProductWithValidTo | null;
  deleteMode: "soft" | "permanent";
  restoringItem: SupplierProductWithValidTo | null;
}

// eslint-disable-next-line max-lines-per-function
export function useSupplierProductsPageState() {
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "supplier_id",
    direction: "asc",
  });
  const [showInactive, setShowInactive] = useState(false);
  const table = useTable({ initialPageSize: 25 });

  // Dialog state
  const [dialogState, setDialogState] = useState<DialogState>({
    isImportDialogOpen: false,
    isCreateDialogOpen: false,
    editingItem: null,
    deletingItem: null,
    deleteMode: "soft",
    restoringItem: null,
  });

  // Data hooks
  const { useList, useCreate, useUpdate, useSoftDelete, usePermanentDelete, useRestore } =
    useSupplierProducts();
  const { data: supplierProducts = [], isLoading, isError, error, refetch } = useList(showInactive);

  const { useList: useProductList } = useProducts();
  const { data: products = [] } = useProductList(true);

  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList(true);

  // Mutations
  const { mutate: create, isPending: isCreating } = useCreate();
  const { mutate: update, isPending: isUpdating } = useUpdate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const { mutate: restore, isPending: isRestoring } = useRestore();

  // Maps for efficient lookups
  const productMap = useMemo(() => {
    return new Map(
      products.map((p) => [p.id, { code: p.product_code || "", name: p.product_name }]),
    );
  }, [products]);

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.id, { code: s.supplier_code, name: s.supplier_name }]));
  }, [suppliers]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return supplierProducts;
    const query = searchQuery.toLowerCase();
    // eslint-disable-next-line complexity
    return supplierProducts.filter((sp) => {
      // Phase1: product_idはnullable
      const p = sp.product_id !== null ? productMap.get(sp.product_id) : null;
      const s = supplierMap.get(sp.supplier_id);
      const targetString = `
        ${sp.product_code || ""} ${sp.product_name || ""}
        ${sp.supplier_code || ""} ${sp.supplier_name || ""}
        ${p?.code || ""} ${p?.name || ""}
        ${s?.code || ""} ${s?.name || ""}
      `.toLowerCase();
      return targetString.includes(query);
    });
  }, [supplierProducts, searchQuery, productMap, supplierMap]);

  // Sorted data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const getVal = (item: SupplierProduct, col: string) => {
        if (col === "product_id") {
          // Phase1: product_idはnullable
          if (item.product_id === null) return "";
          return item.product_code || productMap.get(item.product_id)?.code || "";
        }
        if (col === "supplier_id") {
          return item.supplier_code || supplierMap.get(item.supplier_id)?.code || "";
        }
        return item[col as keyof SupplierProduct];
      };

      const aVal = getVal(a, sort.column);
      const bVal = getVal(b, sort.column);

      if (aVal == null || bVal == null) return 0;
      if (aVal === bVal) return 0;

      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sort, productMap, supplierMap]);

  // Paginated data
  const paginatedData = table.paginateData(sortedData);

  // Dialog handlers
  const openCreateDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isCreateDialogOpen: true }));
  }, []);

  const closeCreateDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isCreateDialogOpen: false }));
  }, []);

  const openImportDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isImportDialogOpen: true }));
  }, []);

  const closeImportDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isImportDialogOpen: false }));
  }, []);

  const openEditDialog = useCallback((item: SupplierProductWithValidTo) => {
    setDialogState((prev) => ({ ...prev, editingItem: item }));
  }, []);

  const closeEditDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, editingItem: null }));
  }, []);

  const openSoftDeleteDialog = useCallback((item: SupplierProductWithValidTo) => {
    setDialogState((prev) => ({ ...prev, deletingItem: item, deleteMode: "soft" }));
  }, []);

  const openPermanentDeleteDialog = useCallback((item: SupplierProductWithValidTo) => {
    setDialogState((prev) => ({ ...prev, deletingItem: item, deleteMode: "permanent" }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, deletingItem: null, deleteMode: "soft" }));
  }, []);

  const switchToPermanentDelete = useCallback(() => {
    setDialogState((prev) => ({ ...prev, deleteMode: "permanent" }));
  }, []);

  const openRestoreDialog = useCallback((item: SupplierProductWithValidTo) => {
    setDialogState((prev) => ({ ...prev, restoringItem: item }));
  }, []);

  const closeRestoreDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, restoringItem: null }));
  }, []);

  // CRUD handlers
  const handleCreate = useCallback(
    (data: SupplierProductCreate | SupplierProductUpdate) => {
      create(data as SupplierProductCreate, { onSuccess: closeCreateDialog });
    },
    [create, closeCreateDialog],
  );

  const handleUpdate = useCallback(
    (data: SupplierProductCreate | SupplierProductUpdate) => {
      if (!dialogState.editingItem) return;
      update(
        { id: dialogState.editingItem.id, data: data as SupplierProductUpdate },
        { onSuccess: closeEditDialog },
      );
    },
    [dialogState.editingItem, update, closeEditDialog],
  );

  const handleSoftDelete = useCallback(
    (endDate: string | null) => {
      if (!dialogState.deletingItem) return;
      softDelete(
        { id: dialogState.deletingItem.id, endDate: endDate || undefined },
        { onSuccess: closeDeleteDialog },
      );
    },
    [dialogState.deletingItem, softDelete, closeDeleteDialog],
  );

  const handlePermanentDelete = useCallback(() => {
    if (!dialogState.deletingItem) return;
    permanentDelete(dialogState.deletingItem.id, { onSuccess: closeDeleteDialog });
  }, [dialogState.deletingItem, permanentDelete, closeDeleteDialog]);

  const handleRestore = useCallback(() => {
    if (!dialogState.restoringItem) return;
    restore(dialogState.restoringItem.id, { onSuccess: closeRestoreDialog });
  }, [dialogState.restoringItem, restore, closeRestoreDialog]);

  return {
    // Data
    supplierProducts,
    products,
    suppliers,
    sortedData,
    isLoading,
    isError,
    error,
    refetch,

    // Filter/sort state
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    showInactive,
    setShowInactive,

    // Pagination
    table,
    paginatedData,
    totalCount: sortedData.length,

    // Dialog state
    ...dialogState,
    openCreateDialog,
    closeCreateDialog,
    openImportDialog,
    closeImportDialog,
    openEditDialog,
    closeEditDialog,
    openSoftDeleteDialog,
    openPermanentDeleteDialog,
    closeDeleteDialog,
    switchToPermanentDelete,
    openRestoreDialog,
    closeRestoreDialog,

    // CRUD handlers
    handleCreate,
    handleUpdate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,

    // Mutation states
    isCreating,
    isUpdating,
    isSoftDeleting,
    isPermanentDeleting,
    isRestoring,
  };
}
