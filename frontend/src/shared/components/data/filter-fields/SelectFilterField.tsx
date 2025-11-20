/**
 * SelectFilterField - セレクトボックスフィルター
 */

import { Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFilterFieldProps {
  /** ラベル */
  label: string;
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** 選択肢 */
  options: SelectOption[];
  /** プレースホルダー */
  placeholder?: string;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function SelectFilterField({
  label,
  value,
  onChange,
  options,
  placeholder = "選択してください",
  className,
  disabled,
}: SelectFilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
