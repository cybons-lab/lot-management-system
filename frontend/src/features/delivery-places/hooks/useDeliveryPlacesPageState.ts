/**
 * useDeliveryPlacesPageState - Page state management hook for DeliveryPlacesListPage
 *
 * Manages:
 * - CRUD operations and mutations
 * - Dialog state (create, edit, delete, restore)
 * - Search, sort, and filter state
 * - Data filtering and sorting logic
 */

import { useState, useMemo, useCallback } from "react";

import type { DeliveryPlaceCreate, DeliveryPlaceUpdate } from "../api";
import type { DeliveryPlaceWithValidTo } from "../components/DeliveryPlacesTable";

import {
  useDeliveryPlaces,
  useCreateDeliveryPlace,
  useUpdateDeliveryPlace,
  useSoftDeleteDeliveryPlace,
  usePermanentDeleteDeliveryPlace,
  useRestoreDeliveryPlace,
} from "./index";

import { useCustomers } from "@/features/customers/hooks";
import type { SortConfig } from "@/shared/components/data/DataTable";

interface DialogState {
  isCreateDialogOpen: boolean;
  editingItem: DeliveryPlaceWithValidTo | null;
  deletingItem: DeliveryPlaceWithValidTo | null;
  deleteMode: "soft" | "permanent";
  restoringItem: DeliveryPlaceWithValidTo | null;
}

// eslint-disable-next-line max-lines-per-function
export function useDeliveryPlacesPageState() {
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "delivery_place_code",
    direction: "asc",
  });
  const [showInactive, setShowInactive] = useState(false);

  // Dialog state
  const [dialogState, setDialogState] = useState<DialogState>({
    isCreateDialogOpen: false,
    editingItem: null,
    deletingItem: null,
    deleteMode: "soft",
    restoringItem: null,
  });

  // Data hooks
  const {
    data: deliveryPlaces = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDeliveryPlaces({ includeInactive: showInactive });

  const { useList } = useCustomers();
  const { data: customers = [] } = useList(true);

  // Mutations
  const { mutate: create, isPending: isCreating } = useCreateDeliveryPlace();
  const { mutate: update, isPending: isUpdating } = useUpdateDeliveryPlace();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDeleteDeliveryPlace();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } =
    usePermanentDeleteDeliveryPlace();
  const { mutate: restore, isPending: isRestoring } = useRestoreDeliveryPlace();

  // Filtered data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return deliveryPlaces;
    const query = searchQuery.toLowerCase();
    return deliveryPlaces.filter(
      (d) =>
        d.delivery_place_code.toLowerCase().includes(query) ||
        d.delivery_place_name.toLowerCase().includes(query),
    );
  }, [deliveryPlaces, searchQuery]);

  // Sorted data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      // @ts-expect-error: sorting logic works with index access for basic properties
      const aVal = a[sort.column];
      // @ts-expect-error: sorting logic works with index access for basic properties
      const bVal = b[sort.column];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sort]);

  // Dialog handlers
  const openCreateDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isCreateDialogOpen: true }));
  }, []);

  const closeCreateDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isCreateDialogOpen: false }));
  }, []);

  const openEditDialog = useCallback((item: DeliveryPlaceWithValidTo) => {
    setDialogState((prev) => ({ ...prev, editingItem: item }));
  }, []);

  const closeEditDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, editingItem: null }));
  }, []);

  const openSoftDeleteDialog = useCallback((item: DeliveryPlaceWithValidTo) => {
    setDialogState((prev) => ({ ...prev, deletingItem: item, deleteMode: "soft" }));
  }, []);

  const openPermanentDeleteDialog = useCallback((item: DeliveryPlaceWithValidTo) => {
    setDialogState((prev) => ({ ...prev, deletingItem: item, deleteMode: "permanent" }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, deletingItem: null, deleteMode: "soft" }));
  }, []);

  const switchToPermanentDelete = useCallback(() => {
    setDialogState((prev) => ({ ...prev, deleteMode: "permanent" }));
  }, []);

  const openRestoreDialog = useCallback((item: DeliveryPlaceWithValidTo) => {
    setDialogState((prev) => ({ ...prev, restoringItem: item }));
  }, []);

  const closeRestoreDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, restoringItem: null }));
  }, []);

  // CRUD handlers
  const handleCreate = useCallback(
    (data: DeliveryPlaceCreate) => {
      create(data, { onSuccess: closeCreateDialog });
    },
    [create, closeCreateDialog],
  );

  const handleUpdate = useCallback(
    (data: DeliveryPlaceUpdate) => {
      if (!dialogState.editingItem) return;
      update({ id: dialogState.editingItem.id, data }, { onSuccess: closeEditDialog });
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
    deliveryPlaces,
    customers,
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

    // Dialog state
    ...dialogState,
    openCreateDialog,
    closeCreateDialog,
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
