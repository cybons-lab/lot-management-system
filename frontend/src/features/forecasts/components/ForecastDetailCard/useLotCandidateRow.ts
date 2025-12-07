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

// eslint-disable-next-line max-lines-per-function -- 83行で3行超過、分割すると可読性低下
export function useLotCandidateRow({
  lot,
  line,
  currentQty,
  allocatedTotal,
  requiredQty,
  onChangeAllocation,
  onSave,
}: UseLotCandidateRowProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const freeQty = Number(lot.available_quantity ?? 0);
  const remainingInLot = Math.max(0, freeQty - currentQty);
  const isExpired = lot.expiry_date ? new Date(lot.expiry_date) < new Date() : false;
  const isLocked = lot.status === "locked" || lot.status === "quarantine";

  const limit = freeQty;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);

    if (value === "" || isNaN(numValue)) {
      if (value === "") onChangeAllocation(line.id, lot.lot_id, 0);
      setIsConfirmed(false);
      return;
    }

    if (numValue < 0) {
      setIsShaking(true);
      toast.error("マイナスの数量は入力できません");
      onChangeAllocation(line.id, lot.lot_id, 0);
      setIsConfirmed(false);
      return;
    }

    if (numValue > limit) {
      setIsShaking(true);
      toast.warning(`在庫数量(${freeQty})を超えています`);
      onChangeAllocation(line.id, lot.lot_id, limit);
      setIsConfirmed(false);
      return;
    }

    onChangeAllocation(line.id, lot.lot_id, numValue);
    setIsConfirmed(false);
  };

  const handleFull = () => {
    const otherAllocated = allocatedTotal - currentQty;
    const needed = Math.max(0, requiredQty - otherAllocated);
    const fillQty = Math.min(freeQty, needed);

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
