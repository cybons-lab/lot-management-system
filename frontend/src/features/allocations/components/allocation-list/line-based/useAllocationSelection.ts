import { useCallback, useState } from "react";

import type { GroupedOrder, LineWithOrderInfo } from "./types";

interface UseAllocationSelectionProps {
  allFlatLines: LineWithOrderInfo[];
  groupedOrders: GroupedOrder[];
  onSaveAllocations: (lineId: number) => void;
}

export function useAllocationSelection({
  allFlatLines,
  groupedOrders,
  onSaveAllocations,
}: UseAllocationSelectionProps) {
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(allFlatLines.map((item) => item.id));
    setSelectedLineIds(allIds);
  }, [allFlatLines]);

  const handleDeselectAll = useCallback(() => {
    setSelectedLineIds(new Set());
  }, []);

  const handleBulkSave = useCallback(() => {
    selectedLineIds.forEach((id) => onSaveAllocations(id));
  }, [selectedLineIds, onSaveAllocations]);

  const handleCheckChange = useCallback((lineId: number, checked: boolean) => {
    setSelectedLineIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(lineId);
      } else {
        newSet.delete(lineId);
      }
      return newSet;
    });
  }, []);

  const handleGroupCheckChange = useCallback(
    (groupId: number, checked: boolean) => {
      setSelectedLineIds((prev) => {
        const newSet = new Set(prev);
        const group = groupedOrders.find((g) => g.order_id === groupId);
        if (!group) return newSet;

        if (checked) {
          group.lines.forEach((line) => newSet.add(line.id));
        } else {
          group.lines.forEach((line) => newSet.delete(line.id));
        }
        return newSet;
      });
    },
    [groupedOrders],
  );

  return {
    selectedLineIds,
    handleSelectAll,
    handleDeselectAll,
    handleBulkSave,
    handleCheckChange,
    handleGroupCheckChange,
  };
}
