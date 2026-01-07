/* eslint-disable max-lines-per-function */
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { getWithdrawals } from "@/features/withdrawals/api";
import { fmt } from "@/shared/utils/number";

interface WithdrawalCalendarProps {
  lotId: number;
}

export function WithdrawalCalendar({ lotId }: WithdrawalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const { data, isLoading } = useQuery({
    queryKey: ["withdrawals", "calendar", lotId, format(currentMonth, "yyyy-MM")],
    queryFn: () =>
      getWithdrawals({
        lot_id: lotId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        limit: 1000,
      }),
    enabled: !!lotId,
  });

  // 日付ごとに集計
  const dailyStats = useMemo(() => {
    if (!data?.withdrawals) return {};
    const stats: Record<string, { count: number; quantity: number }> = {};

    data.withdrawals.forEach((w) => {
      // date-fnsのnew Date()parserはタイムゾーンの影響を受ける可能性があるため、
      // 文字列から直接日付部分を取得します
      const dateKey = w.ship_date.substring(0, 10);
      if (!stats[dateKey]) {
        stats[dateKey] = { count: 0, quantity: 0 };
      }
      stats[dateKey].count++;
      stats[dateKey].quantity += Number(w.quantity);
    });

    return stats;
  }, [data]);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">カレンダーデータを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="w-40 text-center text-xl font-semibold">
          {format(currentMonth, "yyyy年 M月", { locale: ja })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`p-2 text-center text-sm font-medium ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid auto-rows-[100px] grid-cols-7">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const stat = dailyStats[dateKey];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dateKey}
                className={`relative border-r border-b p-2 ${
                  !isCurrentMonth ? "bg-gray-50/50" : ""
                } ${isToday ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-sm ${
                      !isCurrentMonth ? "text-gray-400" : "text-gray-700"
                    } ${isToday ? "font-bold text-blue-600" : ""}`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {stat && (
                  <div className="mt-2 space-y-1">
                    <div
                      className="truncate rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                      title={`${stat.count}件の出庫`}
                    >
                      {stat.count} 件
                    </div>
                    <div
                      className="truncate rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
                      title={`合計 ${fmt(stat.quantity)}`}
                    >
                      計 {fmt(stat.quantity)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
