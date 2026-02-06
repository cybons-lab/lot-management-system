import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Label } from "@/components/ui";
import { Button } from "@/components/ui/base/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/form/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps {
  className?: string;
  date?: DateRange;
  setDate: (date?: DateRange) => void;
}

function parseTimeValue(timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
}

function normalizeDateRange(date?: DateRange): DateRange | undefined {
  if (!date) return undefined;
  return {
    from: date.from ? new Date(date.from.toDateString()) : undefined,
    to: date.to ? new Date(date.to.toDateString()) : undefined,
  };
}

function DateRangeButtonLabel({ date }: { date?: DateRange }) {
  if (!date?.from) return <span>期間を選択</span>;
  if (!date.to) return format(date.from, "yyyy/MM/dd HH:mm", { locale: ja });
  return (
    <>
      {format(date.from, "yyyy/MM/dd HH:mm", { locale: ja })} -{" "}
      {format(date.to, "yyyy/MM/dd HH:mm", { locale: ja })}
    </>
  );
}

function DateRangeSummary({ date }: { date?: DateRange }) {
  if (!date?.from) return <span className="text-muted-foreground">期間を選択してください</span>;
  if (!date.to) return <>{format(date.from, "yyyy/MM/dd", { locale: ja })}</>;
  return (
    <>
      {format(date.from, "yyyy/MM/dd", { locale: ja })} -{" "}
      {format(date.to, "yyyy/MM/dd", { locale: ja })}
    </>
  );
}

function TimeInputField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center">
        <Clock className="text-muted-foreground mr-2 h-4 w-4" />
        <Input
          id={id}
          type="time"
          className="h-8 w-[110px]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function useDateRangeTimeState(date: DateRange | undefined, setDate: (date?: DateRange) => void) {
  const [startTime, setStartTime] = React.useState("00:00");
  const [endTime, setEndTime] = React.useState("23:59");

  React.useEffect(() => {
    if (date?.from) setStartTime(format(date.from, "HH:mm"));
    if (date?.to) setEndTime(format(date.to, "HH:mm"));
  }, [date]);

  const handleTimeChange = (type: "start" | "end", timeValue: string) => {
    if (type === "start") setStartTime(timeValue);
    else setEndTime(timeValue);

    if (!date?.from) return;
    const parsed = parseTimeValue(timeValue);
    if (!parsed) return;

    const newDateRange = { ...date };
    if (type === "start" && newDateRange.from) {
      const newFrom = new Date(newDateRange.from);
      newFrom.setHours(parsed.hours, parsed.minutes);
      newDateRange.from = newFrom;
    }
    if (type === "end" && newDateRange.to) {
      const newTo = new Date(newDateRange.to);
      newTo.setHours(parsed.hours, parsed.minutes);
      newDateRange.to = newTo;
    }
    setDate(newDateRange);
  };

  const handleSelectDate = (newDate: DateRange | undefined) => {
    if (!newDate) {
      setDate(undefined);
      return;
    }
    const start = parseTimeValue(startTime);
    const end = parseTimeValue(endTime);
    if (newDate.from && start) newDate.from.setHours(start.hours, start.minutes);
    if (newDate.to && end) newDate.to.setHours(end.hours, end.minutes);
    setDate(newDate);
  };

  return {
    startTime,
    endTime,
    handleTimeChange,
    handleSelectDate,
  };
}

function DateRangePopoverContent({
  date,
  startTime,
  endTime,
  onTimeChange,
  onSelectDate,
}: {
  date?: DateRange;
  startTime: string;
  endTime: string;
  onTimeChange: (type: "start" | "end", value: string) => void;
  onSelectDate: (date: DateRange | undefined) => void;
}) {
  return (
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        initialFocus
        mode="range"
        defaultMonth={date?.from}
        selected={normalizeDateRange(date)}
        onSelect={onSelectDate}
        numberOfMonths={2}
      />
      <div className="border-t p-3">
        <div className="mb-4 flex items-center justify-center text-sm font-medium">
          <DateRangeSummary date={date} />
        </div>
        <div className="flex items-center gap-4">
          <TimeInputField
            id="start-time"
            label="開始時間"
            value={startTime}
            onChange={(value) => onTimeChange("start", value)}
          />
          <TimeInputField
            id="end-time"
            label="終了時間"
            value={endTime}
            onChange={(value) => onTimeChange("end", value)}
          />
        </div>
      </div>
    </PopoverContent>
  );
}

export function DatePickerWithRange({ className, date, setDate }: DatePickerWithRangeProps) {
  const { startTime, endTime, handleTimeChange, handleSelectDate } = useDateRangeTimeState(
    date,
    setDate,
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <DateRangeButtonLabel date={date} />
          </Button>
        </PopoverTrigger>
        <DateRangePopoverContent
          date={date}
          startTime={startTime}
          endTime={endTime}
          onTimeChange={handleTimeChange}
          onSelectDate={handleSelectDate}
        />
      </Popover>
    </div>
  );
}
