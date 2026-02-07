import { useMemo, useState } from "react";

import { useCalendarDays } from "../../../hooks/ui/useCalendarDays";
import type { DailyStat } from "../components/IntakeHistoryCalendarCell";

import { useIntakeCalendarSummary } from "./useIntakeHistory";

export interface IntakeCalendarLogicProps {
  supplierId?: number | undefined;
  warehouseId?: number | undefined;
  productId?: number | undefined;
}

export function useIntakeCalendarLogic({
  supplierId,
  warehouseId,
  productId,
}: IntakeCalendarLogicProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const {
    data: intakeItems = [],
    isError,
    error,
    refetch,
  } = useIntakeCalendarSummary({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
    ...(warehouseId != null ? { warehouse_id: Number(warehouseId) } : {}),
    ...(productId != null ? { supplier_item_id: Number(productId) } : {}),
    ...(supplierId != null ? { supplier_id: Number(supplierId) } : {}),
  });

  const days = useCalendarDays(currentMonth);

  const dailyStats = useMemo(() => {
    const stats: Record<string, DailyStat> = {};
    (intakeItems || []).forEach((item) => {
      stats[item.date.substring(0, 10)] = {
        count: item.count,
        quantity: Number(item.total_quantity),
      };
    });
    return stats;
  }, [intakeItems]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  return {
    currentMonth,
    days,
    dailyStats,
    hoveredDate,
    setHoveredDate,
    isError,
    error,
    refetch,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
  };
}
