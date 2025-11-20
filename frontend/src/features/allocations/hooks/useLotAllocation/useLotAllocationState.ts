import { useEffect, useState } from "react";

import type { AllocationToastState, LineStatus } from "./lotAllocationTypes";

export function useLotAllocationState() {
  const [allocationsByLine, setAllocationsByLine] = useState<
    Record<number, Record<number, number>>
  >({});

  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>({});

  const [toast, setToast] = useState<AllocationToastState>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    allocationsByLine,
    setAllocationsByLine,
    lineStatuses,
    setLineStatuses,
    toast,
    setToast,
  };
}
