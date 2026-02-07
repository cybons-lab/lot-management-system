import { useMemo, useState } from "react";

import { useCalendarDays, type CalendarDay } from "../../../hooks/ui/useCalendarDays";
import { useIntakeCalendarSummary } from "../hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fmt } from "@/shared/utils/number";

interface DailyStat {
  count: number;
  quantity: number;
}

interface IntakeHistoryCalendarProps {
  supplierId?: number;
  warehouseId?: number;
  productId?: number;
}

// eslint-disable-next-line max-lines-per-function -- 入庫履歴カレンダーの表示ロジックを1箇所で管理するため
export function IntakeHistoryCalendar({
  supplierId,
  warehouseId,
  productId,
}: IntakeHistoryCalendarProps) {
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
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    ...(productId ? { supplier_item_id: productId } : {}),
    ...(supplierId ? { supplier_id: supplierId } : {}),
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
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            今日
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            前月
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            次月
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200">
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
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
            <CalendarCell
              key={idx}
              day={day}
              {...(stat ? { stat } : {})}
              isSelected={isSelected}
              onHover={setHoveredDate}
            />
          );
        })}
      </div>

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
    </Card>
  );
}

function CalendarCell({
  day,
  stat,
  isSelected,
  onHover,
}: {
  day: CalendarDay;
  stat?: DailyStat;
  isSelected: boolean;
  onHover: (date: string | null) => void;
}) {
  const dateStr = day.date.toISOString().substring(0, 10);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex h-24 flex-col gap-1 bg-white p-2 transition-colors hover:bg-slate-50",
              !day.isCurrentMonth && "bg-slate-50/50 text-slate-400",
              day.isToday && "bg-blue-50/30",
              isSelected && "bg-blue-50",
            )}
            onMouseEnter={() => onHover(dateStr)}
            onMouseLeave={() => onHover(null)}
          >
            <span className={cn("text-xs font-medium", day.isToday && "text-blue-600")}>
              {day.date.getDate()}
            </span>

            {stat && (
              <div className="mt-1 flex flex-col gap-1">
                <Badge
                  variant="secondary"
                  className="w-fit border-none bg-blue-100 text-[10px] text-blue-700"
                >
                  {stat.count}件
                </Badge>
                <div className="text-[10px] font-medium text-slate-600">{fmt(stat.quantity)}</div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        {stat && (
          <TooltipContent>
            <div className="space-y-1 p-1">
              <div className="text-xs font-bold">{dateStr}</div>
              <div className="text-[10px]">入荷件数: {stat.count}件</div>
              <div className="text-[10px]">総数量: {fmt(stat.quantity)}</div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
