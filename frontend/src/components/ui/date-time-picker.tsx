"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import * as React from "react";

import { Label } from "@/components/ui";
import { Button } from "@/components/ui/base/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/form/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  className?: string;
  date?: Date;
  setDate: (date?: Date) => void;
  label?: string;
}

export function DateTimePicker({ className, date, setDate, label }: DateTimePickerProps) {
  const [time, setTime] = React.useState("00:00");

  const handleTimeChange = (timeValue: string) => {
    setTime(timeValue);

    if (!date) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const newDate = new Date(date);
    newDate.setHours(hours, minutes);
    setDate(newDate);
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(undefined);
      return;
    }

    // Preserve time from current selection or input
    const [hours, minutes] = time.split(":").map(Number);
    newDate.setHours(hours, minutes);
    setDate(newDate);
  };

  // Sync time input with date prop
  React.useEffect(() => {
    if (date) {
      setTime(format(date, "HH:mm"));
    }
  }, [date]);

  return (
    <div className={cn("grid gap-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy/MM/dd HH:mm", { locale: ja }) : <span>日付を選択</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={
              date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : undefined
            }
            onSelect={handleDateSelect}
            initialFocus
            locale={ja}
          />
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <Input
                type="time"
                className="h-8"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
