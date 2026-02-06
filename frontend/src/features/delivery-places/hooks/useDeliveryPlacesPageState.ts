/**
 * useDeliveryPlacesPageState - Page state management hook for DeliveryPlacesListPage
 *
 * Manages:
 * - CRUD operations and mutations
 * - Dialog state (create, edit, delete, restore)
 * - Search, sort, and filter state
 * - Data filtering and sorting logic
 */

import { useCallback, useMemo, useState } from "react";

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
import { useTable } from "@/hooks/ui";
import type { SortConfig } from "@/shared/components/data/DataTable";

interface DialogState {
  isCreateDialogOpen: boolean;
  editingItem: DeliveryPlaceWithValidTo | null;
  deletingItem: DeliveryPlaceWithValidTo | null;
  deleteMode: "soft" | "permanent";
  restoringItem: DeliveryPlaceWithValidTo | null;
}

const INITIAL_DIALOG_STATE: DialogState = {
  isCreateDialogOpen: false,
  editingItem: null,
  deletingItem: null,
  deleteMode: "soft",
  restoringItem: null,
};

type CreateDeliveryPlaceMutate = ReturnType<typeof useCreateDeliveryPlace>["mutate"];
type UpdateDeliveryPlaceMutate = ReturnType<typeof useUpdateDeliveryPlace>["mutate"];
type SoftDeleteDeliveryPlaceMutate = ReturnType<typeof useSoftDeleteDeliveryPlace>["mutate"];
type PermanentDeleteDeliveryPlaceMutate = ReturnType<
  typeof usePermanentDeleteDeliveryPlace
>["mutate"];
type RestoreDeliveryPlaceMutate = ReturnType<typeof useRestoreDeliveryPlace>["mutate"];

function filterDeliveryPlaces(
  items: DeliveryPlaceWithValidTo[],
  searchQuery: string,
): DeliveryPlaceWithValidTo[] {
  if (!searchQuery.trim()) return items;
  const query = searchQuery.toLowerCase();
  return items.filter(
    (item) =>
      item.delivery_place_code.toLowerCase().includes(query) ||
      item.delivery_place_name.toLowerCase().includes(query),
  );
}

function sortDeliveryPlaces(
  items: DeliveryPlaceWithValidTo[],
  sort: SortConfig,
): DeliveryPlaceWithValidTo[] {
  return [...items].sort((a, b) => {
    const aVal = a[sort.column as keyof DeliveryPlaceWithValidTo];
    const bVal = b[sort.column as keyof DeliveryPlaceWithValidTo];
    if (aVal === undefined || bVal === undefined) return 0;
    const cmp = String(aVal).localeCompare(String(bVal), "ja");
    return sort.direction === "asc" ? cmp : -cmp;
  });
}

function useDeliveryPlaceDialogState() {
  const [dialogState, setDialogState] = useState<DialogState>(INITIAL_DIALOG_STATE);
  const updateDialogState = useCallback(
    (patch: Partial<DialogState>) => setDialogState((prev) => ({ ...prev, ...patch })),
    [],
  );

  const openCreateDialog = useCallback(
    () => updateDialogState({ isCreateDialogOpen: true }),
    [updateDialogState],
  );
  const closeCreateDialog = useCallback(
    () => updateDialogState({ isCreateDialogOpen: false }),
    [updateDialogState],
  );
  const openEditDialog = useCallback(
    (item: DeliveryPlaceWithValidTo) => updateDialogState({ editingItem: item }),
    [updateDialogState],
  );
  const closeEditDialog = useCallback(
    () => updateDialogState({ editingItem: null }),
    [updateDialogState],
  );
  const openSoftDeleteDialog = useCallback(
    (item: DeliveryPlaceWithValidTo) =>
      updateDialogState({ deletingItem: item, deleteMode: "soft" }),
    [updateDialogState],
  );
  const openPermanentDeleteDialog = useCallback(
    (item: DeliveryPlaceWithValidTo) =>
      updateDialogState({ deletingItem: item, deleteMode: "permanent" }),
    [updateDialogState],
  );
  const closeDeleteDialog = useCallback(
    () => updateDialogState({ deletingItem: null, deleteMode: "soft" }),
    [updateDialogState],
  );
  const switchToPermanentDelete = useCallback(
    () => updateDialogState({ deleteMode: "permanent" }),
    [updateDialogState],
  );
  const openRestoreDialog = useCallback(
    (item: DeliveryPlaceWithValidTo) => updateDialogState({ restoringItem: item }),
    [updateDialogState],
  );
  const closeRestoreDialog = useCallback(
    () => updateDialogState({ restoringItem: null }),
    [updateDialogState],
  );

  return {
    dialogState,
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
  };
}

interface DeliveryPlaceCrudHandlerDependencies {
  dialogState: DialogState;
  create: CreateDeliveryPlaceMutate;
  update: UpdateDeliveryPlaceMutate;
  softDelete: SoftDeleteDeliveryPlaceMutate;
  permanentDelete: PermanentDeleteDeliveryPlaceMutate;
  restore: RestoreDeliveryPlaceMutate;
  closeCreateDialog: () => void;
  closeEditDialog: () => void;
  closeDeleteDialog: () => void;
  closeRestoreDialog: () => void;
}

function useDeliveryPlaceCrudHandlers({
  dialogState,
  create,
  update,
  softDelete,
  permanentDelete,
  restore,
  closeCreateDialog,
  closeEditDialog,
  closeDeleteDialog,
  closeRestoreDialog,
}: DeliveryPlaceCrudHandlerDependencies) {
  const handleCreate = useCallback(
    (data: DeliveryPlaceCreate) => create(data, { onSuccess: closeCreateDialog }),
    [closeCreateDialog, create],
  );

  const handleUpdate = useCallback(
    (data: Omit<DeliveryPlaceUpdate, "version">) => {
      if (!dialogState.editingItem) return;
      update(
        {
          id: dialogState.editingItem.id,
          data: { ...data, version: dialogState.editingItem.version },
        },
        { onSuccess: closeEditDialog },
      );
    },
    [closeEditDialog, dialogState.editingItem, update],
  );

  const handleSoftDelete = useCallback(
    (endDate: string | null) => {
      if (!dialogState.deletingItem) return;
      softDelete(
        {
          id: dialogState.deletingItem.id,
          version: dialogState.deletingItem.version,
          endDate: endDate || undefined,
        },
        { onSuccess: closeDeleteDialog },
      );
    },
    [closeDeleteDialog, dialogState.deletingItem, softDelete],
  );

  const handlePermanentDelete = useCallback(() => {
    if (!dialogState.deletingItem) return;
    permanentDelete(
      { id: dialogState.deletingItem.id, version: dialogState.deletingItem.version },
      { onSuccess: closeDeleteDialog },
    );
  }, [closeDeleteDialog, dialogState.deletingItem, permanentDelete]);

  const handleRestore = useCallback(() => {
    if (!dialogState.restoringItem) return;
    restore(dialogState.restoringItem.id, { onSuccess: closeRestoreDialog });
  }, [closeRestoreDialog, dialogState.restoringItem, restore]);

  return {
    handleCreate,
    handleUpdate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
  };
}

function useDeliveryPlacesData(showInactive: boolean) {
  const {
    data: deliveryPlaces = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDeliveryPlaces({
    includeInactive: showInactive,
  });
  const { useList } = useCustomers();
  const { data: customers = [] } = useList(true);
  return { deliveryPlaces, customers, isLoading, isError, error, refetch };
}

function useDeliveryPlaceMutations() {
  const { mutate: create, isPending: isCreating } = useCreateDeliveryPlace();
  const { mutate: update, isPending: isUpdating } = useUpdateDeliveryPlace();
  const {
    mutate: softDelete,
    mutateAsync: softDeleteAsync,
    isPending: isSoftDeleting,
  } = useSoftDeleteDeliveryPlace();
  const {
    mutate: permanentDelete,
    mutateAsync: permanentDeleteAsync,
    isPending: isPermanentDeleting,
  } = usePermanentDeleteDeliveryPlace();
  const { mutate: restore, isPending: isRestoring } = useRestoreDeliveryPlace();
  return {
    create,
    update,
    softDelete,
    permanentDelete,
    restore,
    softDeleteAsync,
    permanentDeleteAsync,
    isCreating,
    isUpdating,
    isSoftDeleting,
    isPermanentDeleting,
    isRestoring,
  };
}

export function useDeliveryPlacesPageState() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "delivery_place_code", direction: "asc" });
  const [showInactive, setShowInactive] = useState(false);
  const table = useTable({ initialPageSize: 25 });

  const dialog = useDeliveryPlaceDialogState();

  const { deliveryPlaces, customers, isLoading, isError, error, refetch } =
    useDeliveryPlacesData(showInactive);
  const mutations = useDeliveryPlaceMutations();

  const filteredData = useMemo(
    () => filterDeliveryPlaces(deliveryPlaces, searchQuery),
    [deliveryPlaces, searchQuery],
  );
  const sortedData = useMemo(() => sortDeliveryPlaces(filteredData, sort), [filteredData, sort]);
  const paginatedData = table.paginateData(sortedData);

  const { handleCreate, handleUpdate, handleSoftDelete, handlePermanentDelete, handleRestore } =
    useDeliveryPlaceCrudHandlers({
      dialogState: dialog.dialogState,
      create: mutations.create,
      update: mutations.update,
      softDelete: mutations.softDelete,
      permanentDelete: mutations.permanentDelete,
      restore: mutations.restore,
      closeCreateDialog: dialog.closeCreateDialog,
      closeEditDialog: dialog.closeEditDialog,
      closeDeleteDialog: dialog.closeDeleteDialog,
      closeRestoreDialog: dialog.closeRestoreDialog,
    });
  const { dialogState, ...dialogHandlers } = dialog;
  const mutationStates = {
    isCreating: mutations.isCreating,
    isUpdating: mutations.isUpdating,
    isSoftDeleting: mutations.isSoftDeleting,
    isPermanentDeleting: mutations.isPermanentDeleting,
    isRestoring: mutations.isRestoring,
  };

  return {
    deliveryPlaces,
    customers,
    sortedData,
    isLoading,
    isError,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    showInactive,
    setShowInactive,
    table,
    paginatedData,
    totalCount: sortedData.length,
    ...dialogState,
    ...dialogHandlers,
    handleCreate,
    handleUpdate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
    ...mutationStates,
    softDeleteAsync: mutations.softDeleteAsync,
    permanentDeleteAsync: mutations.permanentDeleteAsync,
  };
}
