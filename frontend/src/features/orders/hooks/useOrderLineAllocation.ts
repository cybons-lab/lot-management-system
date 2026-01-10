import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

import {
  type Allocation,
  calculateDbAllocationsTotal,
  calculateTotalAllocated,
  checkUnsavedChanges,
  calculateAutoAllocation,
} from "./allocationCalculations";

import * as allocationsApi from "@/features/allocations/api";
import type { CandidateLotItem } from "@/features/allocations/api";
import * as ordersApi from "@/features/orders/api";
import type { OrderLine } from "@/shared/types/aliases";

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

  const existingAllocations = useMemo(
    () => (orderLine?.allocations || orderLine?.allocated_lots || []) as Allocation[],
    [orderLine],
  );

  const hardAllocatedDb = useMemo(() => {
    return calculateDbAllocationsTotal(existingAllocations, "hard");
  }, [existingAllocations]);

  const softAllocatedDb = useMemo(() => {
    return calculateDbAllocationsTotal(existingAllocations, "soft");
  }, [existingAllocations]);

  // Local State Calculations
  const totalAllocated = useMemo(() => {
    return calculateTotalAllocated(lotAllocations);
  }, [lotAllocations]);

  const hardAllocated = Math.min(totalAllocated, hardAllocatedDb);
  const softAllocated = Math.max(0, totalAllocated - hardAllocatedDb);

  // Status Checks
  const hasDbAllocations = hardAllocatedDb + softAllocatedDb > 0;

  const hasUnsavedChanges = useMemo(() => {
    return checkUnsavedChanges(lotAllocations, existingAllocations);
  }, [lotAllocations, existingAllocations]);

  const allocationState = useMemo(() => {
    if (hardAllocatedDb === 0 && softAllocatedDb === 0) return "none" as const;
    if (hardAllocatedDb > 0 && softAllocatedDb === 0) return "hard" as const;
    if (hardAllocatedDb === 0 && softAllocatedDb > 0) return "soft" as const;
    return "mixed" as const;
  }, [hardAllocatedDb, softAllocatedDb]);

  // Use ref to track current orderLine.id for race condition prevention
  const orderLineIdRef = useRef<number | null>(orderLine?.id ?? null);
  orderLineIdRef.current = orderLine?.id ?? null;

  // Effects
  useEffect(() => {
    if (!orderLine) {
      setCandidateLots([]);
      setLotAllocations({});
      return;
    }

    const currentOrderLineId = orderLine.id;
    let isCancelled = false;

    const fetchCandidates = async () => {
      setIsLoadingCandidates(true);
      try {
        const res = await allocationsApi.getAllocationCandidates({
          order_line_id: orderLine.id,
          product_id: Number(orderLine.product_id || 0),
        });

        // Check if orderLine hasn't changed during the request
        if (isCancelled || orderLineIdRef.current !== currentOrderLineId) {
          return;
        }

        setCandidateLots(res.items);

        // Initialize allocations
        const initialAllocations: Record<number, number> = {};
        const currentAllocations = (orderLine.allocations ||
          orderLine.allocated_lots ||
          []) as Allocation[];

        if (Array.isArray(currentAllocations)) {
          currentAllocations.forEach((alloc) => {
            if (alloc.lot_id) {
              initialAllocations[alloc.lot_id] = Number(
                alloc.allocated_quantity || alloc.quantity || 0,
              );
            }
          });
        }
        setLotAllocations(initialAllocations);
      } catch (error) {
        // Skip error handling if request was cancelled
        if (isCancelled || orderLineIdRef.current !== currentOrderLineId) {
          return;
        }
        console.error("Failed to fetch candidate lots", error);
        toast.error("ロット候補の取得に失敗しました");
      } finally {
        if (!isCancelled && orderLineIdRef.current === currentOrderLineId) {
          setIsLoadingCandidates(false);
        }
      }
    };

    fetchCandidates();

    return () => {
      isCancelled = true;
    };
  }, [orderLine]);

  // Actions
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

    const newAllocations = calculateAutoAllocation(Number(orderLine.order_quantity), candidateLots);
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

  const cancelAllAllocations = async () => {
    if (!orderLine) return;

    const allocations = (orderLine.allocations || orderLine.allocated_lots || []) as Allocation[];
    const allocationIds = allocations
      .map((a) => a.id)
      .filter((id): id is number => id !== undefined);

    if (allocationIds.length === 0) {
      toast.info("取り消す引当がありません");
      setLotAllocations({});
      return;
    }

    setIsSaving(true);
    try {
      const result = await allocationsApi.cancelAllocationsByLine(orderLine.id, allocationIds);
      if (!result.success && result.failed_ids.length > 0) {
        toast.warning(`一部の引当の取り消しに失敗しました (${result.failed_ids.length}件)`);
      } else {
        toast.success("引当を取り消しました");
      }
      setLotAllocations({});
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to cancel allocations", error);
      toast.error("引当の取り消しに失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    candidateLots,
    lotAllocations,
    // 状態判定
    hasUnsavedChanges,
    hasDbAllocations,
    allocationState,
    // 数量関連
    hardAllocated,
    softAllocated,
    softAllocatedDb,
    hardAllocatedDb,
    totalAllocated,
    // ローディング状態
    isLoadingCandidates,
    isSaving,
    // 操作
    changeAllocation,
    clearAllocations,
    autoAllocate,
    saveAllocations,
    saveAndConfirmAllocations,
    confirmAllocations,
    cancelAllAllocations,
  };
}
