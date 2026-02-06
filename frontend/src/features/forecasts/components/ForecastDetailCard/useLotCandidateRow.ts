import { useState, useEffect } from "react";
import { toast } from "sonner";

import { type CandidateLotItem } from "@/features/allocations/api";
import { type OrderLine } from "@/shared/types/aliases";

interface UseLotCandidateRowProps {
  lot: CandidateLotItem;
  line: OrderLine;
  currentQty: number;
  allocatedTotal: number;
  requiredQty: number;
  onChangeAllocation: (lineId: number, lotId: number, value: number) => void;
  onSave: () => void;
}

interface InputChangeResult {
  nextQty?: number;
  toastType?: "error" | "warning";
  toastMessage?: string;
  shouldShake?: boolean;
}

function resolveInputChange(value: string, limit: number, freeQty: number): InputChangeResult {
  if (value === "") return { nextQty: 0 };

  const numValue = Number(value);
  if (Number.isNaN(numValue)) return {};
  if (numValue < 0) {
    return {
      nextQty: 0,
      shouldShake: true,
      toastType: "error",
      toastMessage: "マイナスの数量は入力できません",
    };
  }
  if (numValue > limit) {
    return {
      nextQty: limit,
      shouldShake: true,
      toastType: "warning",
      toastMessage: `在庫数量(${freeQty})を超えています`,
    };
  }
  return { nextQty: numValue };
}

function calculateFillQty(
  allocatedTotal: number,
  currentQty: number,
  requiredQty: number,
  freeQty: number,
) {
  const otherAllocated = allocatedTotal - currentQty;
  const needed = Math.max(0, requiredQty - otherAllocated);
  return { fillQty: Math.min(freeQty, needed), needed };
}

function useAutoResetShake() {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (!isShaking) return;
    const timer = setTimeout(() => setIsShaking(false), 500);
    return () => clearTimeout(timer);
  }, [isShaking]);

  return { isShaking, triggerShake: () => setIsShaking(true) };
}

export function useLotCandidateRow({
  lot,
  line,
  currentQty,
  allocatedTotal,
  requiredQty,
  onChangeAllocation,
  onSave,
}: UseLotCandidateRowProps) {
  const { isShaking, triggerShake } = useAutoResetShake();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const freeQty = Number(lot.available_quantity ?? 0);
  const remainingInLot = Math.max(0, freeQty - currentQty);
  const isExpired = lot.expiry_date ? new Date(lot.expiry_date) < new Date() : false;
  const isLocked = lot.status === "locked" || lot.status === "quarantine";

  const limit = freeQty;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const result = resolveInputChange(value, limit, freeQty);
    if (result.shouldShake) triggerShake();
    if (result.toastType === "error" && result.toastMessage) toast.error(result.toastMessage);
    if (result.toastType === "warning" && result.toastMessage) toast.warning(result.toastMessage);
    if (result.nextQty !== undefined) {
      onChangeAllocation(line.id, lot.lot_id, result.nextQty);
    }
    setIsConfirmed(false);
  };

  const handleFull = () => {
    const { fillQty, needed } = calculateFillQty(allocatedTotal, currentQty, requiredQty, freeQty);

    if (fillQty === 0 && needed === 0) {
      toast.info("既に必要数を満たしています");
      return;
    }

    onChangeAllocation(line.id, lot.lot_id, fillQty);
    setIsConfirmed(true);
  };

  const handleConfirm = () => {
    if (currentQty > 0) {
      onSave();
      setIsConfirmed(true);
      toast.success("引当を確定しました");
    }
  };

  const handleClear = () => {
    onChangeAllocation(line.id, lot.lot_id, 0);
    setIsConfirmed(false);
  };

  return {
    isShaking,
    isConfirmed,
    freeQty,
    remainingInLot,
    isExpired,
    isLocked,
    limit,
    handleInputChange,
    handleFull,
    handleConfirm,
    handleClear,
  };
}
