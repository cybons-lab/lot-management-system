import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

import * as allocationsApi from "@/features/allocations/api";
import * as ordersApi from "@/features/orders/api";
import type { OrderLine } from "@/shared/types/aliases";
import type { CandidateLotItem } from "@/features/allocations/api";

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

  // 状態判定: DBに引当があるか
  const hasDbAllocations = hardAllocatedDb + softAllocatedDb > 0;

  // 状態判定: 未保存の変更があるか（ローカル編集がDB状態と異なる）
  // eslint-disable-next-line complexity -- ローカルとDB状態の比較には複数の条件分岐が必要
  const hasUnsavedChanges = useMemo(() => {
    // ローカルの引当が0件ならDBと異なる可能性をチェック
    const localTotal = Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0);
    const dbTotal = hardAllocatedDb + softAllocatedDb;

    // 簡易判定: 合計が異なるか、ローカルに編集があるか
    if (localTotal !== dbTotal) return true;
    if (localTotal === 0 && dbTotal === 0) return false;

    // 詳細判定: 各ロットの数量が一致するか
    const existingAllocations = (orderLine?.allocations ||
      orderLine?.allocated_lots ||
      []) as Allocation[];
    const dbAllocMap = new Map<number, number>();
    existingAllocations.forEach((a) => {
      if (a.lot_id) {
        dbAllocMap.set(a.lot_id, Number(a.allocated_quantity || a.quantity || 0));
      }
    });

    // ローカルとDBで各ロットの数量を比較
    for (const [lotId, qty] of Object.entries(lotAllocations)) {
      const dbQty = dbAllocMap.get(Number(lotId)) || 0;
      if (qty !== dbQty) return true;
    }
    // DBにあってローカルにないものをチェック
    for (const [lotId, dbQty] of dbAllocMap.entries()) {
      const localQty = lotAllocations[lotId] || 0;
      if (localQty !== dbQty) return true;
    }

    return false;
  }, [lotAllocations, hardAllocatedDb, softAllocatedDb, orderLine]);

  // 引当の状態: 'none' | 'soft' | 'hard' | 'mixed'
  const allocationState = useMemo(() => {
    if (hardAllocatedDb === 0 && softAllocatedDb === 0) return "none" as const;
    if (hardAllocatedDb > 0 && softAllocatedDb === 0) return "hard" as const;
    if (hardAllocatedDb === 0 && softAllocatedDb > 0) return "soft" as const;
    return "mixed" as const;
  }, [hardAllocatedDb, softAllocatedDb]);

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
        const res = await allocationsApi.getAllocationCandidates({
          order_line_id: orderLine.id,
          product_id: Number(orderLine.product_id || 0),
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

  // 全引当をキャンセル
  const cancelAllAllocations = async () => {
    if (!orderLine) return;
    setIsSaving(true);
    try {
      await allocationsApi.cancelAllocationsByLine(orderLine.id);
      setLotAllocations({});
      toast.success("引当を取り消しました");
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
