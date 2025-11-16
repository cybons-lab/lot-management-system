/**
 * NumberRangeFilterField - 数値範囲フィルター
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/libs/utils";

export interface NumberRangeFilterFieldProps {
  /** ラベル */
  label: string;
  /** 最小値 */
  min: string;
  /** 最大値 */
  max: string;
  /** 最小値変更時のコールバック */
  onMinChange: (value: string) => void;
  /** 最大値変更時のコールバック */
  onMaxChange: (value: string) => void;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function NumberRangeFilterField({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  className,
  disabled,
}: NumberRangeFilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          value={min}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMinChange(e.target.value)}
          disabled={disabled}
          placeholder="最小値"
        />
        <Input
          type="number"
          value={max}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMaxChange(e.target.value)}
          disabled={disabled}
          placeholder="最大値"
        />
      </div>
    </div>
  );
}
