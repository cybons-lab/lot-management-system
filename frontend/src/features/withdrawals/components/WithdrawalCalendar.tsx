/**
 * WithdrawalCalendar
 *
 * モダンな出庫履歴カレンダーコンポーネント
 * - 日付ごとの出庫件数と数量を表示
 * - 日付クリックで新規出庫ダイアログを開く
 */
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
import { ChevronLeft, ChevronRight, Package, Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { getWithdrawals } from "@/features/withdrawals/api";
import { fmt } from "@/shared/utils/number";

interface WithdrawalCalendarProps {
  lotId: number;
  onDateSelect?: (date: string) => void;
  showWithdrawButton?: boolean;
}

interface DailyStat {
  count: number;
  quantity: number;
  withdrawals: Array<{
    withdrawal_id: number;
    quantity: string;
    customer_name: string;
  }>;
}

interface CalendarDayProps {
  day: Date;
  stat: DailyStat | undefined;
  isCurrentMonth: boolean;
  isToday: boolean;
  isHovered: boolean;
  showWithdrawButton: boolean;
  onHover: (dateKey: string | null) => void;
  onDateClick: (date: Date) => void;
}

function getDateNumberClass(isToday: boolean, isCurrentMonth: boolean, dayOfWeek: number): string {
  if (isToday) return "bg-blue-500 font-bold text-white";
  if (!isCurrentMonth) return "text-slate-300";
  if (dayOfWeek === 0) return "text-red-400";
  if (dayOfWeek === 6) return "text-blue-400";
  return "text-slate-700";
}

function getDayCellClass(isCurrentMonth: boolean, isToday: boolean, isHovered: boolean): string {
  const base = "group relative cursor-pointer p-2 transition-all duration-150";
  const bg = !isCurrentMonth ? "bg-slate-50/50" : "bg-white";
  const today = isToday ? "bg-blue-50/70" : "";
  const hover = isHovered && isCurrentMonth ? "bg-slate-50" : "";
  return `${base} ${bg} ${today} ${hover}`;
}

function CalendarDay({
  day,
  stat,
  isCurrentMonth,
  isToday,
  isHovered,
  showWithdrawButton,
  onHover,
  onDateClick,
}: CalendarDayProps) {
  const dateKey = format(day, "yyyy-MM-dd");
  const dateNumberClass = getDateNumberClass(isToday, isCurrentMonth, day.getDay());
  const cellClass = getDayCellClass(isCurrentMonth, isToday, isHovered);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cellClass}
      onMouseEnter={() => onHover(dateKey)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onDateClick(day)}
      onKeyDown={(e) => e.key === "Enter" && onDateClick(day)}
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors ${dateNumberClass}`}
        >
          {format(day, "d")}
        </span>
        {showWithdrawButton && isCurrentMonth && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDateClick(day);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-0 transition-all hover:bg-blue-100 hover:text-blue-600 group-hover:opacity-100"
            title="この日に出庫を追加"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {stat && <DayStats stat={stat} />}
      {stat && isHovered && stat.withdrawals.length > 0 && <DayTooltip day={day} stat={stat} />}
    </div>
  );
}

function DayStats({ stat }: { stat: DailyStat }) {
  return (
    <div className="mt-1 space-y-1">
      <div
        className="flex items-center gap-1 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm"
        title={`${stat.count}件の出庫`}
      >
        <Package className="h-3 w-3" />
        <span>{stat.count}件</span>
      </div>
      <div
        className="rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
        title={`合計 ${fmt(stat.quantity)}`}
      >
        {fmt(stat.quantity)}
      </div>
    </div>
  );
}

function DayTooltip({ day, stat }: { day: Date; stat: DailyStat }) {
  return (
    <div className="absolute top-full left-1/2 z-50 mt-1 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-700">
        {format(day, "M月d日", { locale: ja })}の出庫詳細
      </div>
      <div className="max-h-32 space-y-1.5 overflow-y-auto">
        {stat.withdrawals.slice(0, 5).map((w) => (
          <div key={w.withdrawal_id} className="flex items-center justify-between text-xs">
            <span className="truncate text-slate-600">{w.customer_name || "—"}</span>
            <span className="ml-2 font-medium text-slate-800">{fmt(w.quantity)}</span>
          </div>
        ))}
        {stat.withdrawals.length > 5 && (
          <div className="text-center text-[10px] text-slate-400">
            他 {stat.withdrawals.length - 5}件
          </div>
        )}
      </div>
    </div>
  );
}

interface MonthHeaderProps {
  currentMonth: Date;
  monthlyTotal: { count: number; quantity: number };
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

function MonthHeader({
  currentMonth,
  monthlyTotal,
  onPrevMonth,
  onNextMonth,
  onToday,
}: MonthHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevMonth}
          className="h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[140px] text-center text-lg font-semibold text-slate-800">
          {format(currentMonth, "yyyy年 M月", { locale: ja })}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextMonth}
          className="h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          className="ml-2 text-xs text-slate-500 hover:text-slate-700"
        >
          今月
        </Button>
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
          <Package className="h-4 w-4 text-blue-500" />
          <div className="text-sm">
            <span className="text-slate-600">出庫件数: </span>
            <span className="font-semibold text-blue-700">{monthlyTotal.count}件</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <div className="text-sm">
            <span className="text-slate-600">合計数量: </span>
            <span className="font-semibold text-emerald-700">{fmt(monthlyTotal.quantity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function WeekdayHeader() {
  return (
    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
      {WEEK_DAYS.map((day, i) => (
        <div
          key={day}
          className={`py-3 text-center text-xs font-semibold uppercase tracking-wider ${
            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-500"
          }`}
        >
          {day}
        </div>
      ))}
    </div>
  );
}

function CalendarLegend() {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-full bg-blue-500" />
        <span>今日</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-6 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
        <span>出庫件数</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-6 rounded bg-gradient-to-r from-emerald-500 to-emerald-600" />
        <span>出庫数量</span>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
        <span>読み込み中...</span>
      </div>
    </div>
  );
}

function useWithdrawalCalendarData(lotId: number, currentMonth: Date) {
  const monthStart = startOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(endOfMonth(currentMonth));

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

  const dailyStats = useMemo(() => {
    if (!data?.withdrawals) return {};
    const stats: Record<string, DailyStat> = {};
    data.withdrawals.forEach((w) => {
      const dateKey = w.ship_date.substring(0, 10);
      if (!stats[dateKey]) stats[dateKey] = { count: 0, quantity: 0, withdrawals: [] };
      stats[dateKey].count++;
      stats[dateKey].quantity += Number(w.quantity);
      stats[dateKey].withdrawals.push({
        withdrawal_id: w.withdrawal_id,
        quantity: w.quantity,
        customer_name: w.customer_name,
      });
    });
    return stats;
  }, [data]);

  const monthlyTotal = useMemo(() => {
    return Object.values(dailyStats).reduce(
      (acc, stat) => ({ count: acc.count + stat.count, quantity: acc.quantity + stat.quantity }),
      { count: 0, quantity: 0 },
    );
  }, [dailyStats]);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return { dailyStats, monthlyTotal, days, isLoading };
}

export function WithdrawalCalendar({
  lotId,
  onDateSelect,
  showWithdrawButton = true,
}: WithdrawalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const { dailyStats, monthlyTotal, days, isLoading } = useWithdrawalCalendarData(lotId, currentMonth);

  const handleDateClick = (date: Date) => onDateSelect?.(format(date, "yyyy-MM-dd"));

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 p-4">
      <MonthHeader
        currentMonth={currentMonth}
        monthlyTotal={monthlyTotal}
        onPrevMonth={() => setCurrentMonth((prev) => subMonths(prev, 1))}
        onNextMonth={() => setCurrentMonth((prev) => addMonths(prev, 1))}
        onToday={() => setCurrentMonth(new Date())}
      />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <WeekdayHeader />
        <div className="grid auto-rows-[90px] grid-cols-7 divide-x divide-y divide-slate-100">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            return (
              <CalendarDay
                key={dateKey}
                day={day}
                stat={dailyStats[dateKey]}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isSameDay(day, new Date())}
                isHovered={hoveredDate === dateKey}
                showWithdrawButton={showWithdrawButton}
                onHover={setHoveredDate}
                onDateClick={handleDateClick}
              />
            );
          })}
        </div>
      </div>
      <CalendarLegend />
    </div>
  );
}
