import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useExcelViewData } from "./useExcelViewData";
import { useUpdateAllocationSuggestionsBatch } from "@/features/allocations/hooks/api/useAllocationSuggestions";
import { useDeleteLot } from "@/hooks/mutations";
import { inventoryItemKeys } from "@/features/inventory/hooks";
import { archiveLot, updateLot } from "@/services/api/lot-service";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";
import {
    smartSplitLot,
    updateLotQuantityWithReason,
    type AllocationTransfer,
} from "@/features/inventory/api";
import { createDeliveryPlace } from "@/features/delivery-places/api";
import { createDeliverySetting, updateDeliverySetting } from "@/features/customer-items/delivery-settings/api";
import {
    readDestinationOrder,
    writeDestinationOrder,
    mergeDestinationOrder,
    reorderDestinations,
    moveDestinationId,
} from "../utils/destination-utils";
import { NewDestinationFormData } from "../subcomponents/AddDestinationDialog";

/**
 * ExcelView ページのビジネスロジックを集約するカスタムフック
 */
export function useExcelView(productId: number, customerItemId?: number) {
    const queryClient = useQueryClient();

    // -- UI States --
    const [selectedLotIdForAddDest, setSelectedLotIdForAddDest] = useState<number | null>(null);
    const [addedDates, setAddedDates] = useState<string[]>([]);
    const [isLotIntakeDialogOpen, setIsLotIntakeDialogOpen] = useState(false);
    const [smartSplitDialogOpen, setSmartSplitDialogOpen] = useState(false);
    const [selectedLotForSmartSplit, setSelectedLotForSmartSplit] = useState<{
        lotId: number;
        lotNumber: string;
        currentQuantity: number;
    } | null>(null);
    const [quantityUpdateDialogOpen, setQuantityUpdateDialogOpen] = useState(false);
    const [selectedLotForQuantityUpdate, setSelectedLotForQuantityUpdate] = useState<{
        lotId: number;
        lotNumber: string;
        currentQuantity: number;
    } | null>(null);

    // -- Data Fetching --
    const { data, isLoading, supplierId, customerItem } = useExcelViewData(
        productId,
        customerItemId,
    );

    // -- Display Order Persistence --
    const destinationOrderKey = useMemo(() => {
        const customerKey = customerItemId ? `customer-${customerItemId}` : "all-customers";
        return `excel-view-destination-order:${productId}:${customerKey}`;
    }, [customerItemId, productId]);

    const [destinationOrder, setDestinationOrder] = useState<number[]>([]);

    const destinationIds = useMemo(
        () => data?.lots?.[0]?.destinations.map((d) => d.deliveryPlaceId) || [],
        [data?.lots],
    );

    useEffect(() => {
        if (destinationIds.length === 0) return;
        setDestinationOrder((current) => {
            const stored = readDestinationOrder(destinationOrderKey);
            const base = stored.length > 0 ? stored : current;
            return mergeDestinationOrder(base.length > 0 ? base : destinationIds, destinationIds);
        });
    }, [destinationIds, destinationOrderKey]);

    useEffect(() => {
        if (destinationOrder.length === 0) return;
        writeDestinationOrder(destinationOrderKey, destinationOrder);
    }, [destinationOrder, destinationOrderKey]);

    // -- Computed Data --
    const orderedLots = useMemo(() => {
        if (!data) return [];
        if (destinationOrder.length === 0) return data.lots;
        return data.lots.map((lot) => ({
            ...lot,
            destinations: reorderDestinations(lot.destinations, destinationOrder),
        }));
    }, [data, destinationOrder]);

    const orderedInvolvedDestinations = useMemo(() => {
        if (!data) return [];
        if (destinationOrder.length === 0) return data.involvedDestinations;
        return reorderDestinations(data.involvedDestinations, destinationOrder);
    }, [data, destinationOrder]);

    const allDateColumns = useMemo(() => {
        const base = data?.dateColumns || [];
        return Array.from(new Set([...base, ...addedDates])).sort();
    }, [data?.dateColumns, addedDates]);

    // -- Mutations --
    const updateMutation = useUpdateAllocationSuggestionsBatch();
    const deleteLotMutation = useDeleteLot({
        onSuccess: () => toast.success("ロットを削除しました"),
    });

    const archiveMutation = useMutation({
        mutationFn: ({ id, lotNumber }: { id: number; lotNumber?: string }) =>
            archiveLot(id, lotNumber),
        onSuccess: () => {
            toast.success("ロットをアーカイブしました");
            queryClient.invalidateQueries({ queryKey: ["lots"] });
            queryClient.invalidateQueries({ queryKey: inventoryItemKeys.all });
            queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] });
        },
        onError: async (error) => {
            const message = await getUserFriendlyMessageAsync(error);
            toast.error(`ロットのアーカイブに失敗しました: ${message}`);
        },
    });

    const smartSplitMutation = useMutation({
        mutationFn: ({ lotId, transfers, splitCount }: { lotId: number; transfers: AllocationTransfer[]; splitCount: number }) =>
            smartSplitLot(lotId, { split_count: splitCount, allocation_transfers: transfers }),
        onSuccess: (result) => {
            toast.success(result.message || "ロットを分割しました");
            queryClient.invalidateQueries({ queryKey: ["lots"] });
            queryClient.invalidateQueries({ queryKey: inventoryItemKeys.all });
            queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] });
        },
        onError: async (error) => {
            const message = await getUserFriendlyMessageAsync(error);
            toast.error(`ロット分割に失敗しました: ${message}`);
        },
    });

    const quantityUpdateMutation = useMutation({
        mutationFn: ({ lotId, newQuantity, reason }: { lotId: number; newQuantity: number; reason: string }) =>
            updateLotQuantityWithReason(lotId, { new_quantity: newQuantity, reason }),
        onSuccess: () => {
            toast.success("入庫数を更新しました");
            queryClient.invalidateQueries({ queryKey: ["lots"] });
            queryClient.invalidateQueries({ queryKey: inventoryItemKeys.all });
        },
        onError: async (error) => {
            const message = await getUserFriendlyMessageAsync(error);
            toast.error(`入庫数の更新に失敗しました: ${message}`);
        },
    });

    // -- Handlers --
    const handleQtyChange = useCallback(async (lotId: number, dpId: number, date: string, value: number) => {
        const lot = data?.lots.find((l) => l.lotId === lotId);
        const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
        if (!lot || !dest) return;

        try {
            await updateMutation.mutateAsync({
                updates: [{
                    lot_id: lotId,
                    delivery_place_id: dpId,
                    supplier_item_id: productId,
                    customer_id: dest.customerId,
                    forecast_period: date,
                    quantity: value,
                    coa_issue_date: dest.coaIssueDate || null,
                }],
            });
            toast.success("数量を保存しました");
        } catch {
            toast.error("数量の保存に失敗しました");
        }
    }, [data, productId, updateMutation]);

    const handleCoaDateChange = useCallback(async (lotId: number, dpId: number, date: string, coaDate: string | null) => {
        const lot = data?.lots.find((l) => l.lotId === lotId);
        const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
        if (!lot || !dest) return;

        try {
            await updateMutation.mutateAsync({
                updates: [{
                    lot_id: lotId,
                    delivery_place_id: dpId,
                    supplier_item_id: productId,
                    customer_id: dest.customerId,
                    forecast_period: date,
                    quantity: dest.shipmentQtyByDate[date] || 0,
                    coa_issue_date: coaDate,
                }],
            });
            toast.success("成績書日付を保存しました");
        } catch {
            toast.error("成績書日付の保存に失敗しました");
        }
    }, [data, productId, updateMutation]);

    const handleLotFieldChange = useCallback(async (lotId: number, field: string, value: string) => {
        try {
            await updateLot(lotId, { [field]: value });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["lots"] }),
                queryClient.invalidateQueries({ queryKey: inventoryItemKeys.all }),
            ]);
        } catch (error) {
            const message = await getUserFriendlyMessageAsync(error);
            toast.error(`ロット情報の更新に失敗しました: ${message}`);
        }
    }, [queryClient]);

    const handleCommentChange = useCallback(async (lotId: number, dpId: number, date: string, comment: string | null) => {
        const lot = data?.lots.find((l) => l.lotId === lotId);
        const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
        if (!lot || !dest) return;

        try {
            await updateMutation.mutateAsync({
                updates: [{
                    lot_id: lotId,
                    delivery_place_id: dpId,
                    supplier_item_id: productId,
                    customer_id: dest.customerId,
                    forecast_period: date,
                    quantity: dest.shipmentQtyByDate[date] || 0,
                    coa_issue_date: dest.coaIssueDate || null,
                    comment: comment,
                }],
            });
            toast.success("コメントを保存しました");
            await queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"], refetchType: "all" });
        } catch {
            toast.error("コメントの保存に失敗しました");
        }
    }, [data, productId, updateMutation, queryClient]);

    const handleManualShipmentDateChange = useCallback(async (lotId: number, dpId: number, date: string, shipmentDate: string | null) => {
        const lot = data?.lots.find((l) => l.lotId === lotId);
        const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
        if (!lot || !dest) return;

        try {
            await updateMutation.mutateAsync({
                updates: [{
                    lot_id: lotId,
                    delivery_place_id: dpId,
                    supplier_item_id: productId,
                    customer_id: dest.customerId,
                    forecast_period: date,
                    quantity: dest.shipmentQtyByDate[date] || 0,
                    coa_issue_date: dest.coaIssueDate || null,
                    comment: dest.commentByDate?.[date] || null,
                    manual_shipment_date: shipmentDate,
                }],
            });
            toast.success("出荷日を保存しました");
            await queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"], refetchType: "all" });
        } catch {
            toast.error("出荷日の保存に失敗しました");
        }
    }, [data, productId, updateMutation, queryClient]);

    const handleSmartSplitLot = useCallback((lotId: number) => {
        const lot = data?.lots.find((l) => l.lotId === lotId);
        if (!lot) return;
        setSelectedLotForSmartSplit({
            lotId,
            lotNumber: lot.lotNumber || `ロット${lotId}`,
            currentQuantity: lot.totalStock,
        });
        setSmartSplitDialogOpen(true);
    }, [data]);

    const handleUpdateQuantity = useCallback((lotId: number) => {
        const lot = data?.lots.find((l) => l.lotId === lotId);
        if (!lot) return;
        setSelectedLotForQuantityUpdate({
            lotId,
            lotNumber: lot.lotNumber || `ロット${lotId}`,
            currentQuantity: lot.totalStock,
        });
        setQuantityUpdateDialogOpen(true);
    }, [data]);

    const handleReorderDestination = useCallback((fromId: number, toId: number) => {
        setDestinationOrder((current) => {
            const base = current.length > 0 ? current : mergeDestinationOrder([], destinationIds);
            return moveDestinationId(base, fromId, toId);
        });
    }, [destinationIds]);

    const handleConfirmAddDestination = useCallback(async (formData: NewDestinationFormData) => {
        if (!selectedLotIdForAddDest || !customerItem || !data) {
            toast.error("必要なデータが不足しています");
            return;
        }
        const firstDate = allDateColumns[0];
        if (!firstDate) {
            toast.error("日付列がありません。先に日付列を追加してください。");
            setSelectedLotIdForAddDest(null);
            return;
        }

        try {
            const newDeliveryPlace = await createDeliveryPlace({
                customer_id: customerItem.customer_id,
                jiku_code: formData.jiku_code,
                delivery_place_name: formData.delivery_place_name,
                delivery_place_code: formData.delivery_place_code,
            });

            try {
                await createDeliverySetting({
                    customer_item_id: customerItem.id,
                    delivery_place_id: newDeliveryPlace.id,
                    is_default: false,
                    jiku_code: formData.jiku_code,
                });
            } catch (e: any) {
                if (e?.response?.status !== 409) {
                    toast.warning("マスタ同期に失敗しましたが、引当レコードは作成されます");
                }
            }

            await updateMutation.mutateAsync({
                updates: [{
                    lot_id: selectedLotIdForAddDest,
                    delivery_place_id: newDeliveryPlace.id,
                    supplier_item_id: productId,
                    customer_id: customerItem.customer_id,
                    forecast_period: firstDate,
                    quantity: 0,
                }],
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"], refetchType: "all" }),
                queryClient.invalidateQueries({ queryKey: ["customer-item-delivery-settings"], refetchType: "all" }),
                queryClient.invalidateQueries({ queryKey: ["delivery-places"], refetchType: "all" }),
                queryClient.invalidateQueries({ queryKey: ["inventoryItems"], refetchType: "all" }),
            ]);
            toast.success("納入先を追加しました");
        } catch {
            toast.error("納入先の追加に失敗しました");
        }
        setSelectedLotIdForAddDest(null);
    }, [selectedLotIdForAddDest, allDateColumns, customerItem, productId, updateMutation, queryClient, data]);

    const handleSaveNotes = useCallback(async (nextValue: string) => {
        if (!data?.deliverySettingId || data.deliverySettingVersion == null) {
            toast.error("納入先設定IDが見つかりません");
            return;
        }
        try {
            await updateDeliverySetting(data.deliverySettingId, {
                notes: nextValue || null,
                version: data.deliverySettingVersion,
            });
            toast.success("ページメモを保存しました");
            queryClient.invalidateQueries({ queryKey: ["customer-item-delivery-settings"] });
        } catch {
            toast.error("ページメモの保存に失敗しました");
        }
    }, [data, queryClient]);

    return {
        data,
        isLoading,
        supplierId,
        customerItem,
        orderedLots,
        orderedInvolvedDestinations,
        allDateColumns,

        // States & Setters
        isLotIntakeDialogOpen,
        setIsLotIntakeDialogOpen,
        smartSplitDialogOpen,
        setSmartSplitDialogOpen,
        selectedLotForSmartSplit,
        quantityUpdateDialogOpen,
        setQuantityUpdateDialogOpen,
        selectedLotForQuantityUpdate,
        selectedLotIdForAddDest,
        setSelectedLotIdForAddDest,

        // Mutations Pending State
        isArchivePending: archiveMutation.isPending,
        isSmartSplitPending: smartSplitMutation.isPending,
        isQuantityUpdatePending: quantityUpdateMutation.isPending,

        // Handlers
        handleQtyChange,
        handleCoaDateChange,
        handleLotFieldChange,
        handleCommentChange,
        handleManualShipmentDateChange,
        handleAddNewColumn: (date: Date) => {
            const dateStr = date.toISOString().split("T")[0];
            if (dateStr) setAddedDates((prev) => [...prev, dateStr]);
        },
        handleDeleteLot: (lotId: number) => deleteLotMutation.mutate(lotId),
        handleArchiveLot: (lotId: number, lotNumber?: string) => archiveMutation.mutate({ id: lotId, lotNumber }),
        handleSmartSplitLot,
        handleUpdateQuantity,
        handleReorderDestination,
        handleConfirmAddDestination,
        handleConfirmSmartSplit: async (lotId: number, transfers: AllocationTransfer[], splitCount: number) => {
            await smartSplitMutation.mutateAsync({ lotId, transfers, splitCount });
            setSmartSplitDialogOpen(false);
            setSelectedLotForSmartSplit(null);
        },
        handleConfirmQuantityUpdate: async (lotId: number, newQuantity: number, reason: string) => {
            await quantityUpdateMutation.mutateAsync({ lotId, newQuantity, reason });
            setQuantityUpdateDialogOpen(false);
            setSelectedLotForQuantityUpdate(null);
        },
        handleSaveNotes,
    };
}
