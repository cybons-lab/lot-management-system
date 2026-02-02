/**
 * IntakeHistoryCalendar
 *
 * 入庫履歴カレンダーコンポーネント
 * - 日付ごとの入庫件数と数量を表示
 */
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
import { ChevronLeft, ChevronRight, Package, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import type { DailyIntakeSummary } from "../api";
import { useIntakeCalendarSummary } from "../hooks";

import { Button } from "@/components/ui";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { fmt } from "@/shared/utils/number";

interface IntakeHistoryCalendarProps {
  supplierId?: number;
  warehouseId?: number;
  productId?: number;
}

interface DailyStat {
  count: number;
  quantity: number;
}

function getDateNumberClass(isToday: boolean, isCurrentMonth: boolean, dayOfWeek: number): string {
  if (isToday) return "bg-green-500 font-bold text-white";
  if (!isCurrentMonth) return "text-slate-300";
  if (dayOfWeek === 0) return "text-red-400";
  if (dayOfWeek === 6) return "text-blue-400";
  return "text-slate-700";
}

function getDayCellClass(isCurrentMonth: boolean, isToday: boolean, isHovered: boolean): string {
  const base = "group relative p-2 transition-all duration-150";
  const bg = !isCurrentMonth ? "bg-slate-50/50" : "bg-white";
  const today = isToday ? "bg-green-50/70" : "";
  const hover = isHovered && isCurrentMonth ? "bg-slate-50" : "";
  return `${base} ${bg} ${today} ${hover}`;
}

interface CalendarDayProps {
  day: Date;
  stat: DailyStat | undefined;
  isCurrentMonth: boolean;
  isToday: boolean;
  isHovered: boolean;
  onHover: (dateKey: string | null) => void;
}

function CalendarDay({ day, stat, isCurrentMonth, isToday, isHovered, onHover }: CalendarDayProps) {
  const dateKey = format(day, "yyyy-MM-dd");
  const dateNumberClass = getDateNumberClass(isToday, isCurrentMonth, day.getDay());
  const cellClass = getDayCellClass(isCurrentMonth, isToday, isHovered);

  return (
    <div
      className={cellClass}
      onMouseEnter={() => onHover(dateKey)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors ${dateNumberClass}`}
        >
          {format(day, "d")}
        </span>
      </div>
      {stat && <DayStats stat={stat} />}
    </div>
  );
}

function DayStats({ stat }: { stat: DailyStat }) {
  return (
    <div className="mt-1 space-y-1">
      <div
        className="flex items-center gap-1 rounded-md bg-gradient-to-r from-green-500 to-green-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm"
        title={`${stat.count}件の入庫`}
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
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
          <Package className="h-4 w-4 text-green-500" />
          <div className="text-sm">
            <span className="text-slate-600">入庫件数: </span>
            <span className="font-semibold text-green-700">{monthlyTotal.count}件</span>
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
          className={`py-3 text-center text-xs font-semibold tracking-wider uppercase ${
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
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <span>今日</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-6 rounded bg-gradient-to-r from-green-500 to-green-600" />
        <span>入庫件数</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-6 rounded bg-gradient-to-r from-emerald-500 to-emerald-600" />
        <span>入庫数量</span>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-green-500" />
        <span>読み込み中...</span>
      </div>
    </div>
  );
}

function useCalendarDays(currentMonth: Date) {
  return useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);
}

export function IntakeHistoryCalendar({
  supplierId,
  warehouseId,
  productId,
}: IntakeHistoryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useIntakeCalendarSummary({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    supplier_item_id: productId,
  });

  const days = useCalendarDays(currentMonth);

  const dailyStats = useMemo(() => {
    const stats: Record<string, DailyStat> = {};
    (data || []).forEach((item: DailyIntakeSummary) => {
      stats[item.date.substring(0, 10)] = {
        count: item.count,
        quantity: Number(item.total_quantity),
      };
    });
    return stats;
  }, [data]);

  const monthlyTotal = useMemo(() => {
    return Object.values(dailyStats).reduce(
      (acc, s) => ({ count: acc.count + s.count, quantity: acc.quantity + s.quantity }),
      { count: 0, quantity: 0 },
    );
  }, [dailyStats]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="p-4">
        <QueryErrorFallback
          error={error}
          resetError={refetch}
          title="入庫履歴の取得に失敗しました"
        />
      </div>
    );
  }

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
                onHover={setHoveredDate}
              />
            );
          })}
        </div>
      </div>
      <CalendarLegend />
    </div>
  );
}
