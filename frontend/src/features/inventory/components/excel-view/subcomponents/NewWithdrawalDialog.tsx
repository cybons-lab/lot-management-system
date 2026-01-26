import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/base/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: Date) => void;
  existingDates: string[];
}

export function NewWithdrawalDialog({ open, onOpenChange, onConfirm, existingDates }: Props) {
  const [date, setDate] = useState<Date>();

  const handleConfirm = () => {
    if (date) {
      onConfirm(date);
      onOpenChange(false);
      setDate(undefined);
    }
  };

  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return existingDates.includes(dateStr);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>引当列の追加</DialogTitle>
          <DialogDescription>
            新しい引当日を選択してください。既に存在する日付は選択できません。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
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
                  {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : <span>日付を選択</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={isDateDisabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={!date}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
