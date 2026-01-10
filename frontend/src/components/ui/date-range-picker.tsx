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

/* eslint-disable max-lines-per-function */
export function DatePickerWithRange({ className, date, setDate }: DatePickerWithRangeProps) {
  // Local state for time inputs
  // Initialize from props if available
  const [startTime, setStartTime] = React.useState("00:00");
  const [endTime, setEndTime] = React.useState("23:59");

  // Sync local time state when date changes externally (reset defaults if new date selected? optional)
  // For now, let's just use simple inputs that update the Date objects on change.

  const handleTimeChange = (type: "start" | "end", timeValue: string) => {
    if (type === "start") setStartTime(timeValue);
    else setEndTime(timeValue);

    if (!date?.from) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const newDateRange = { ...date };
    
    if (type === "start" && newDateRange.from) {
      const newFrom = new Date(newDateRange.from);
      newFrom.setHours(hours, minutes);
      newDateRange.from = newFrom;
    }
    
    if (type === "end" && newDateRange.to) {
      const newTo = new Date(newDateRange.to);
      newTo.setHours(hours, minutes);
      newDateRange.to = newTo;
    }
    
    setDate(newDateRange);
  };

  // Update time inputs when date prop updates (e.g. initial load)
  React.useEffect(() => {
    if (date?.from) {
      setStartTime(format(date.from, "HH:mm"));
    }
    if (date?.to) {
      setEndTime(format(date.to, "HH:mm"));
    }
  }, [date]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy/MM/dd HH:mm", { locale: ja })} -{" "}
                  {format(date.to, "yyyy/MM/dd HH:mm", { locale: ja })}
                </>
              ) : (
                format(date.from, "yyyy/MM/dd HH:mm", { locale: ja })
              )
            ) : (
              <span>期間を選択</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            // Pass normalized dates (time stripped) to Calendar to ensure highlighting works based on date part only
            selected={
              date
                ? {
                    from: date.from ? new Date(date.from.toDateString()) : undefined,
                    to: date.to ? new Date(date.to.toDateString()) : undefined,
                  }
                : undefined
            }
            onSelect={(newDate) => {
              // Preserve times when dates change
              const updatedDate = newDate;
              if (updatedDate?.from) {
                const [h, m] = startTime.split(":").map(Number);
                updatedDate.from.setHours(h, m);
              }
              if (updatedDate?.to) {
                const [h, m] = endTime.split(":").map(Number);
                updatedDate.to.setHours(h, m);
              }
              setDate(updatedDate);
            }}
            numberOfMonths={2}
          />
          <div className="border-t p-3">
             <div className="mb-4 flex items-center justify-center text-sm font-medium">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "yyyy/MM/dd", { locale: ja })} -{" "}
                      {format(date.to, "yyyy/MM/dd", { locale: ja })}
                    </>
                  ) : (
                    format(date.from, "yyyy/MM/dd", { locale: ja })
                  )
                ) : (
                  <span className="text-muted-foreground">期間を選択してください</span>
                )}
             </div>
             <div className="flex items-center gap-4">
               <div className="grid gap-1.5">
                 <Label htmlFor="start-time" className="text-xs">開始時間</Label>
                 <div className="flex items-center">
                   <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                   <Input
                     id="start-time"
                     type="time"
                     className="h-8 w-[110px]"
                     value={startTime}
                     onChange={(e) => handleTimeChange("start", e.target.value)}
                   />
                 </div>
               </div>
               <div className="grid gap-1.5">
                 <Label htmlFor="end-time" className="text-xs">終了時間</Label>
                 <div className="flex items-center">
                   <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                   <Input
                     id="end-time"
                     type="time"
                     className="h-8 w-[110px]"
                     value={endTime}
                     onChange={(e) => handleTimeChange("end", e.target.value)}
                   />
                 </div>
               </div>
             </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
