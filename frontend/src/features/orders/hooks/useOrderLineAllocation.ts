import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import * as ordersApi from "@/features/orders/api";
import * as allocationsApi from "@/features/allocations/api";
import type { OrderLine } from "@/shared/types/aliases";
import type { CandidateLotItem } from "@/shared/types/schema";

interface UseOrderLineAllocationProps {
    orderLine: OrderLine | null;
    onSuccess?: () => void;
}

export function useOrderLineAllocation({ orderLine, onSuccess }: UseOrderLineAllocationProps) {
    const [candidateLots, setCandidateLots] = useState<CandidateLotItem[]>([]);
    const [lotAllocations, setLotAllocations] = useState<Record<number, number>>({});
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch candidates when orderLine changes
    useEffect(() => {
        if (!orderLine) {
            setCandidateLots([]);
            setLotAllocations({});
            return;
        }

        const fetchCandidates = async () => {
            setIsLoadingCandidates(true);
            try {
                const res = await ordersApi.getCandidateLots({
                    product_id: orderLine.product_id,
                    delivery_place_id: orderLine.delivery_place_id,
                });
                setCandidateLots(res.items);

                // Initialize allocations from existing orderLine.allocated_lots if any
                // Note: We need to map existing allocations to the local state
                // But OrderLine from API (via getOrder) contains `allocations` or `allocated_lots`?
                // normalize.ts says allocated_lots.
                // Let's assume we start fresh or need to map it.
                // For now, initially we might want to populate from existing if we are Editing.
                // But usually "Allocate" means we are adding/modifying.
                // If the backend `allocated_lots` has data, we should show it.
                const initialAllocations: Record<number, number> = {};
                if (orderLine.allocated_lots && Array.isArray(orderLine.allocated_lots)) {
                    // Mapping logic if needed. 
                    // However, the panel expects us to manage *updates*. 
                    // If we are in "Edit" mode, we should pre-fill.
                    // For simple implementation, we might rely on the backend response 
                    // for current state and this state for *changes*.
                    // But `LotAllocationPanel` takes `lotAllocations` as the *current* target state.
                    // So we should pre-fill.
                    orderLine.allocated_lots.forEach((alloc: any) => {
                        if (alloc.lot_id) {
                            initialAllocations[alloc.lot_id] = Number(alloc.allocated_quantity || alloc.quantity || 0);
                        }
                    });
                }
                setLotAllocations(initialAllocations);

            } catch (error) {
                console.error("Failed to fetch candidate lots", error);
                toast.error("ロット候補の取得に失敗しました");
            } finally {
                setIsLoadingCandidates(false);
            }
        };

        fetchCandidates();
    }, [orderLine]);

    const changeAllocation = useCallback((lotId: number, quantity: number) => {
        setLotAllocations((prev) => ({
            ...prev,
            [lotId]: quantity,
        }));
    }, []);

    const clearAllocations = useCallback(() => {
        setLotAllocations({});
    }, []);

    const autoAllocate = useCallback(() => {
        if (!orderLine || candidateLots.length === 0) return;

        // Simple FIFO/FEFO logic (candidates are usually sorted by expiry)
        // We need to fill `orderLine.order_quantity - currentAllocated`?
        // Or just fill total `order_quantity`.
        // Let's assume we want to reach order_quantity.

        // Calculate already allocated is tricky if we don't track what was already committed vs draft.
        // But here `lotAllocations` represents the *desired* final state for this session.
        // So we reset and fill up to order_quantity.

        let remaining = Number(orderLine.order_quantity);
        const newAllocations: Record<number, number> = {};

        for (const lot of candidateLots) {
            if (remaining <= 0) break;

            const available = Number(lot.available_quantity || 0); // This should be "allocatable" qty
            // Logic: min(remaining, available)
            // Note: `current_quantity` - `allocated_quantity` = `free_qty`.

            const allocQty = Math.min(remaining, available);
            if (allocQty > 0) {
                newAllocations[lot.lot_id] = allocQty;
                remaining -= allocQty;
            }
        }
        setLotAllocations(newAllocations);
    }, [orderLine, candidateLots]);

    const saveAllocations = async () => {
        if (!orderLine) return;
        setIsSaving(true);
        try {
            // Transform local state to API payload
            const allocationsList = Object.entries(lotAllocations)
                .filter(([_, qty]) => qty > 0)
                .map(([lotId, qty]) => ({
                    lot_id: Number(lotId),
                    quantity: qty,
                }));

            await ordersApi.createLotAllocations(orderLine.id, {
                allocations: allocationsList,
            });

            toast.success("引当を保存しました");
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to save allocations", error);
            toast.error("引当の保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmAllocations = async () => {
        if (!orderLine || !orderLine.allocations) {
            toast.error("確定対象の引当がありません");
            return;
        }
        setIsSaving(true);
        try {
            const ids = orderLine.allocations.map((a: any) => a.id);
            if (ids.length === 0) {
                toast.error("確定対象の引当がありません");
                return;
            }

            await allocationsApi.confirmAllocationsBatch({
                allocation_ids: ids,
            });

            toast.success("引当を確定しました");
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to confirm allocations", error);
            toast.error("引当の確定に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    return {
        candidateLots,
        lotAllocations,
        isLoadingCandidates,
        isSaving,
        changeAllocation,
        clearAllocations,
        autoAllocate,
        saveAllocations,
        confirmAllocations,
    };
}
