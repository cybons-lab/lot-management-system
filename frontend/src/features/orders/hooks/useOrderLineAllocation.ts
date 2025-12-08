import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

import * as allocationsApi from "@/features/allocations/api";
import * as ordersApi from "@/features/orders/api";
import type { OrderLine } from "@/shared/types/aliases";
import type { CandidateLotItem } from "@/shared/types/schema";

interface Allocation {
  id?: number;
  lot_id: number;
  allocated_quantity?: number | string;
  quantity?: number;
  allocation_type?: string;
}

interface UseOrderLineAllocationProps {
  orderLine: OrderLine | null;
  onSuccess?: () => void;
}

// eslint-disable-next-line max-lines-per-function -- 引当関連の状態と処理を一箇所にまとめた複合フック
export function useOrderLineAllocation({ orderLine, onSuccess }: UseOrderLineAllocationProps) {
  const [candidateLots, setCandidateLots] = useState<CandidateLotItem[]>([]);
  const [lotAllocations, setLotAllocations] = useState<Record<number, number>>({});
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate totals
  const hardAllocatedDb = useMemo(() => {
    const allocations = (orderLine?.allocations || orderLine?.allocated_lots || []) as Allocation[];
    if (!Array.isArray(allocations)) return 0;
    return allocations
      .filter((a) => a.allocation_type === "hard")
      .reduce((sum, a) => sum + Number(a.allocated_quantity || a.quantity || 0), 0);
  }, [orderLine]);

  // DBに存在するSOFT引当の合計（Hard確定ボタンの表示制御に使用）
  const softAllocatedDb = useMemo(() => {
    const allocations = (orderLine?.allocations || orderLine?.allocated_lots || []) as Allocation[];
    if (!Array.isArray(allocations)) return 0;
    return allocations
      .filter((a) => a.allocation_type === "soft")
      .reduce((sum, a) => sum + Number(a.allocated_quantity || a.quantity || 0), 0);
  }, [orderLine]);

  const totalAllocated = useMemo(() => {
    return Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0);
  }, [lotAllocations]);

  const hardAllocated = Math.min(totalAllocated, hardAllocatedDb);
  const softAllocated = Math.max(0, totalAllocated - hardAllocatedDb);

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
          order_line_id: orderLine.id,
        });
        setCandidateLots(res.items);

        // Initialize allocations from existing orderLine.allocations or allocated_lots
        const initialAllocations: Record<number, number> = {};
        const existingAllocations = orderLine.allocations || orderLine.allocated_lots || [];

        if (Array.isArray(existingAllocations)) {
          (existingAllocations as Allocation[]).forEach((alloc) => {
            if (alloc.lot_id) {
              initialAllocations[alloc.lot_id] = Number(
                alloc.allocated_quantity || alloc.quantity || 0,
              );
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

    let remaining = Number(orderLine.order_quantity);
    const newAllocations: Record<number, number> = {};

    for (const lot of candidateLots) {
      if (remaining <= 0) break;

      const available = Number(lot.available_quantity || 0);
      const allocQty = Math.min(remaining, available);
      if (allocQty > 0) {
        newAllocations[lot.lot_id] = allocQty;
        remaining -= allocQty;
      }
    }
    setLotAllocations(newAllocations);
  }, [orderLine, candidateLots]);

  const saveAllocations = async (): Promise<number[] | null> => {
    if (!orderLine) return null;
    setIsSaving(true);
    try {
      const allocationsList = Object.entries(lotAllocations)
        .filter(([_, qty]) => qty > 0)
        .map(([lotId, qty]) => ({
          lot_id: Number(lotId),
          quantity: qty,
        }));

      const result = await ordersApi.createLotAllocations(orderLine.id, {
        allocations: allocationsList,
      });

      toast.success("引当を保存しました");
      if (onSuccess) onSuccess();
      return result.allocated_ids ?? null;
    } catch (error) {
      console.error("Failed to save allocations", error);
      toast.error("引当の保存に失敗しました");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const saveAndConfirmAllocations = async () => {
    if (!orderLine) return;
    setIsSaving(true);
    try {
      const allocationsList = Object.entries(lotAllocations)
        .filter(([_, qty]) => qty > 0)
        .map(([lotId, qty]) => ({
          lot_id: Number(lotId),
          quantity: qty,
        }));

      // Step 1: Save allocations (creates soft allocations)
      const result = await ordersApi.createLotAllocations(orderLine.id, {
        allocations: allocationsList,
      });

      const allocatedIds = result.allocated_ids ?? [];

      if (allocatedIds.length === 0) {
        toast.success("引当を保存しました（確定対象なし）");
        if (onSuccess) onSuccess();
        return;
      }

      // Step 2: Confirm allocations (soft -> hard)
      await allocationsApi.confirmAllocationsBatch({
        allocation_ids: allocatedIds,
      });

      toast.success("引当を保存・確定しました");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to save and confirm allocations", error);
      toast.error("引当の保存・確定に失敗しました");
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
      const allocations = orderLine.allocations as Allocation[];
      const ids = allocations.map((a) => a.id).filter((id): id is number => id !== undefined);
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
    hardAllocated,
    softAllocated,
    softAllocatedDb,
    totalAllocated,
    isLoadingCandidates,
    isSaving,
    changeAllocation,
    clearAllocations,
    autoAllocate,
    saveAllocations,
    saveAndConfirmAllocations,
    confirmAllocations,
  };
}
