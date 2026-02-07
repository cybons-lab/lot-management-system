/**
 * useUomConversionsPageState - Page state management hook for UomConversionsPage
 *
 * Manages:
 * - CRUD operations and mutations
 * - Dialog state (create, delete, restore)
 * - Filter state (supplier, inactive toggle)
 */

import { useState, useMemo, useCallback, useEffect } from "react";

import type { UomConversionCreate, UomConversionResponse } from "../api";

import { useInlineEdit } from "./useInlineEdit";
import { useCreateUomConversion, useUomConversions } from "./useUomConversions";

import { useSupplierFilter } from "@/features/assignments/hooks";
import { useSupplierProducts } from "@/features/supplier-products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

interface DialogState {
  isImportDialogOpen: boolean;
  isCreateDialogOpen: boolean;
  deletingItem: UomConversionResponse | null;
  deleteMode: "soft" | "permanent";
  restoringItem: UomConversionResponse | null;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function useUomConversionsPageState() {
  // 担当仕入先フィルターロジック（共通フック）
  const { assignedSupplierIds } = useSupplierFilter();

  // 担当仕入先が1つのみの場合、自動選択
  const initialSupplierId =
    assignedSupplierIds.length === 1 ? String(assignedSupplierIds[0]) : "all";

  // Filter state
  const [showInactive, setShowInactive] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplierId);

  // 担当仕入先が変更された場合、初期値を更新
  useEffect(() => {
    if (assignedSupplierIds.length === 1 && selectedSupplierId === "all") {
      setSelectedSupplierId(String(assignedSupplierIds[0]));
    }
  }, [assignedSupplierIds, selectedSupplierId]);

  // Dialog state
  const [dialogState, setDialogState] = useState<DialogState>({
    isImportDialogOpen: false,
    isCreateDialogOpen: false,
    deletingItem: null,
    deleteMode: "soft",
    restoringItem: null,
  });

  // Data hooks
  const { useList, useSoftDelete, usePermanentDelete, useRestore } = useUomConversions();
  const { data: conversions = [], isLoading } = useList(showInactive);

  const { useList: useProductList } = useSupplierProducts();
  const { data: products = [] } = useProductList();

  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList();

  // Mutations
  const createMutation = useCreateUomConversion();
  const inlineEdit = useInlineEdit();
  const softDeleteMutation = useSoftDelete();
  const permanentDeleteMutation = usePermanentDelete();
  const restoreMutation = useRestore();

  // Product-Supplier mapping for filtering
  const productSupplierMap = useMemo(() => {
    const map = new Map<number, number[]>();
    products.forEach((p) => {
      map.set(p.id, p.supplier_id ? [p.supplier_id] : []);
    });
    return map;
  }, [products]);

  // Filtered data
  const filteredConversions = useMemo(() => {
    if (selectedSupplierId === "all") return conversions;
    const supplierId = Number(selectedSupplierId);

    return conversions.filter((c) => {
      if (!c.supplier_item_id) return false;
      const supplierIds = productSupplierMap.get(c.supplier_item_id);
      return supplierIds?.includes(supplierId);
    });
  }, [conversions, selectedSupplierId, productSupplierMap]);

  // Product options for create dialog
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        product_name: p.display_name,
        product_code: p.maker_part_no,
        supplier_ids: p.supplier_id ? [p.supplier_id] : [],
      })),
    [products],
  );

  // Dialog handlers
  const openImportDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isImportDialogOpen: true }));
  }, []);

  const closeImportDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isImportDialogOpen: false }));
  }, []);

  const openCreateDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isCreateDialogOpen: true }));
  }, []);

  const closeCreateDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isCreateDialogOpen: false }));
  }, []);

  const openSoftDeleteDialog = useCallback((item: UomConversionResponse) => {
    setDialogState((prev) => ({ ...prev, deletingItem: item, deleteMode: "soft" }));
  }, []);

  const openPermanentDeleteDialog = useCallback((item: UomConversionResponse) => {
    setDialogState((prev) => ({ ...prev, deletingItem: item, deleteMode: "permanent" }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, deletingItem: null, deleteMode: "soft" }));
  }, []);

  const switchToPermanentDelete = useCallback(() => {
    setDialogState((prev) => ({ ...prev, deleteMode: "permanent" }));
  }, []);

  const openRestoreDialog = useCallback((item: UomConversionResponse) => {
    setDialogState((prev) => ({ ...prev, restoringItem: item }));
  }, []);

  const closeRestoreDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, restoringItem: null }));
  }, []);

  // CRUD handlers
  const handleCreate = useCallback(
    (data: UomConversionCreate) => {
      createMutation.mutate(data, { onSuccess: closeCreateDialog });
    },
    [createMutation, closeCreateDialog],
  );

  const handleSoftDelete = useCallback(
    (endDate: string | null) => {
      if (!dialogState.deletingItem) return;
      softDeleteMutation.mutate(
        {
          id: dialogState.deletingItem.conversion_id,
          version: dialogState.deletingItem.version,
          ...(endDate ? { endDate } : {}),
        },
        { onSuccess: closeDeleteDialog },
      );
    },
    [dialogState.deletingItem, softDeleteMutation, closeDeleteDialog],
  );

  const handlePermanentDelete = useCallback(() => {
    if (!dialogState.deletingItem) return;
    permanentDeleteMutation.mutate(
      { id: dialogState.deletingItem.conversion_id, version: dialogState.deletingItem.version },
      {
        onSuccess: closeDeleteDialog,
      },
    );
  }, [dialogState.deletingItem, permanentDeleteMutation, closeDeleteDialog]);

  const handleRestore = useCallback(() => {
    if (!dialogState.restoringItem) return;
    restoreMutation.mutate(dialogState.restoringItem.conversion_id, {
      onSuccess: closeRestoreDialog,
    });
  }, [dialogState.restoringItem, restoreMutation, closeRestoreDialog]);

  return {
    // Data
    conversions,
    filteredConversions,
    products: productOptions,
    suppliers,
    isLoading,

    // Filter state
    showInactive,
    setShowInactive,
    selectedSupplierId,
    setSelectedSupplierId,

    // Dialog state
    ...dialogState,
    openImportDialog,
    closeImportDialog,
    openCreateDialog,
    closeCreateDialog,
    openSoftDeleteDialog,
    openPermanentDeleteDialog,
    closeDeleteDialog,
    switchToPermanentDelete,
    openRestoreDialog,
    closeRestoreDialog,

    // CRUD handlers
    handleCreate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,

    // Inline edit
    inlineEdit,

    // Mutation states
    isCreating: createMutation.isPending,
    isSoftDeleting: softDeleteMutation.isPending,
    isPermanentDeleting: permanentDeleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}
