import type { CalendarDay } from "../../../hooks/ui/useCalendarDays";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/shared/libs/utils";
import { fmt } from "@/shared/utils/number";

export interface DailyStat {
  count: number;
  quantity: number;
}

interface CalendarCellProps {
  day: CalendarDay;
  stat?: DailyStat | undefined;
  isSelected: boolean;
  onHover: (date: string | null) => void;
}

export function IntakeHistoryCalendarCell({ day, stat, isSelected, onHover }: CalendarCellProps) {
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
