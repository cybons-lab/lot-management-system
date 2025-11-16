/**
 * CheckboxFilterField - チェックボックスフィルター
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/libs/utils";

export interface CheckboxFilterFieldProps {
  /** ラベル */
  label: string;
  /** チェック状態 */
  checked: boolean;
  /** 変更時のコールバック */
  onChange: (checked: boolean) => void;
  /** 説明文 */
  description?: string;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function CheckboxFilterField({
  label,
  checked,
  onChange,
  description,
  className,
  disabled,
}: CheckboxFilterFieldProps) {
  return (
    <div className={cn("flex items-start space-x-2", className)}>
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-1"
      />
      <div className="flex flex-col gap-1">
        <Label
          htmlFor={label}
          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
  );
}
