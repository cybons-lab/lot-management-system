import { useIntakeCalendarLogic } from "../hooks/useIntakeCalendarLogic";

import { IntakeHistoryCalendarCell } from "./IntakeHistoryCalendarCell";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CalendarDay } from "@/hooks/ui/useCalendarDays";

interface IntakeHistoryCalendarProps {
  supplierId?: number;
  warehouseId?: number;
  productId?: number;
}

export function IntakeHistoryCalendar({
  supplierId,
  warehouseId,
  productId,
}: IntakeHistoryCalendarProps) {
  const {
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
  } = useIntakeCalendarLogic({
    supplierId,
    warehouseId,
    productId,
  });

  if (isError) {
    return (
      <Card className="flex h-96 flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-500">カレンダーデータの取得に失敗しました</p>
        <p className="text-xs text-red-500">{(error as Error)?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          再試行
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-slate-50 py-2 text-center text-xs font-medium text-slate-500"
          >
            {day}
          </div>
        ))}

        {days.map((day: CalendarDay, idx: number) => {
          const dateStr = day.date.toISOString().substring(0, 10);
          const stat = dailyStats[dateStr];
          const isSelected = dateStr === hoveredDate;

          return (
            <IntakeHistoryCalendarCell
              key={idx}
              day={day}
              stat={stat}
              isSelected={isSelected}
              onHover={setHoveredDate}
            />
          );
        })}
      </div>

      <CalendarLegend />
    </Card>
  );
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function CalendarHeader({
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-slate-800">
        {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
      </h3>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          今日
        </Button>
        <Button variant="outline" size="sm" onClick={onPrevMonth}>
          前月
        </Button>
        <Button variant="outline" size="sm" onClick={onNextMonth}>
          次月
        </Button>
      </div>
    </div>
  );
}

function CalendarLegend() {
  return (
    <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-blue-100" />
        <span>通常入荷</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-orange-100" />
        <span>サンプル/その他</span>
      </div>
    </div>
  );
}
