/**
 * TextFilterField - テキスト入力フィルター
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/libs/utils";

export interface TextFilterFieldProps {
  /** ラベル */
  label: string;
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function TextFilterField({
  label,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: TextFilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
