/**
 * DateRangeFilterField - 日付範囲フィルター
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/libs/utils";

export interface DateRangeFilterFieldProps {
  /** ラベル */
  label: string;
  /** 開始日 */
  startDate: string;
  /** 終了日 */
  endDate: string;
  /** 開始日変更時のコールバック */
  onStartDateChange: (value: string) => void;
  /** 終了日変更時のコールバック */
  onEndDateChange: (value: string) => void;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function DateRangeFilterField({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  disabled,
}: DateRangeFilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onStartDateChange(e.target.value)}
          disabled={disabled}
          placeholder="開始日"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEndDateChange(e.target.value)}
          disabled={disabled}
          placeholder="終了日"
        />
      </div>
    </div>
  );
}
