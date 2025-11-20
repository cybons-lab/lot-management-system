/**
 * DateFilterField - 日付入力フィルター
 */

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

export interface DateFilterFieldProps {
  /** ラベル */
  label: string;
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function DateFilterField({
  label,
  value,
  onChange,
  className,
  disabled,
}: DateFilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="date"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
