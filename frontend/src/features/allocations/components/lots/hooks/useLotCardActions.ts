/**
 * Custom hook for lot card allocation actions.
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface UseLotCardActionsProps {
  allocatedQty: number;
  freeQty: number;
  limit: number;
  requiredQty: number;
  onAllocationChange: (qty: number) => void;
  onFullAllocation: (qty: number) => void;
}

export function useLotCardActions({
  allocatedQty,
  freeQty,
  limit,
  requiredQty,
  onAllocationChange,
  onFullAllocation,
}: UseLotCardActionsProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Stop shake animation after timeout
  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);

    // Empty string = 0
    if (value === "") {
      onAllocationChange(0);
      setIsConfirmed(false);
      return;
    }

    if (isNaN(numValue)) return;

    // Negative check
    if (numValue < 0) {
      setIsShaking(true);
      toast.error("マイナスの数量は入力できません");
      onAllocationChange(0);
      setIsConfirmed(false);
      return;
    }

    // Upper limit check
    if (numValue > limit) {
      setIsShaking(true);
      if (freeQty < limit && numValue > freeQty) {
        toast.warning(`在庫数量(${freeQty})を超えています`);
      } else {
        toast.warning(`必要数量を超えています`);
      }
      onAllocationChange(limit);
      setIsConfirmed(false);
      return;
    }

    onAllocationChange(numValue);
    setIsConfirmed(false);
  };

  const handleFullAllocation = () => {
    const fillQty = Math.min(freeQty, requiredQty);
    onFullAllocation(fillQty);
    setIsConfirmed(true);
  };

  const handleConfirm = () => {
    if (allocatedQty > 0) {
      setIsConfirmed(true);
      toast.success("引当を確定しました");
    }
  };

  const handleClearAllocation = () => {
    onAllocationChange(0);
    setIsConfirmed(false);
  };

  return {
    isShaking,
    isConfirmed,
    handleInputChange,
    handleFullAllocation,
    handleConfirm,
    handleClearAllocation,
  };
}
