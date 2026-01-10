"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Label } from "@/components/ui";
import { Button } from "@/components/ui/base/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  className?: string;
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({ className, date, onDateChange }: DateRangePickerProps) {
  const handleFromDateChange = (newDate: Date | undefined) => {
    onDateChange?.({
      from: newDate,
      to: date?.to,
    });
  };

  const handleToDateChange = (newDate: Date | undefined) => {
    onDateChange?.({
      from: date?.from,
      to: newDate,
    });
  };

  return (
    <div className={cn("flex items-end gap-4", className)}>
      {/* Start Date */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">開始日</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !date?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                format(date.from, "yyyy/MM/dd", { locale: ja })
              ) : (
                <span>日付を選択</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date?.from}
              onSelect={handleFromDateChange}
              initialFocus
              locale={ja}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">終了日</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !date?.to && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.to ? (
                format(date.to, "yyyy/MM/dd", { locale: ja })
              ) : (
                <span>日付を選択</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date?.to}
              onSelect={handleToDateChange}
              initialFocus
              locale={ja}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
