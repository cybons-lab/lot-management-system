import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo } from "react";

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * カレンダー表示用の日付配列を生成するカスタムフック
 * @param month 表示対象の月（任意の日付）
 */
export function useCalendarDays(month: Date): CalendarDay[] {
  return useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));

    const days = eachDayOfInterval({ start, end });

    return days.map((date) => ({
      date,
      isCurrentMonth: isSameMonth(date, month),
      isToday: isToday(date),
    }));
  }, [month]);
}
