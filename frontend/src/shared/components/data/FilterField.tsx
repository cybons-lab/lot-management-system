/**
 * FilterField.tsx
 *
 * フィルター項目コンポーネント
 * - テキストフィルター
 * - セレクトフィルター
 * - 日付フィルター
 * - チェックボックスフィルター
 */

import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/libs/utils";

// ============================================
// 共通フィルターラッパー
// ============================================

export interface FilterFieldProps {
  /** ラベル */
  label: string;
  /** 子要素 */
  children: ReactNode;
  /** 説明文 */
  description?: string;
  /** label要素のhtmlFor */
  htmlFor?: string;
  /** クラス名 */
  className?: string;
}

/**
 * フィルター用の共通ラッパーコンポーネント
 * - ラベルと補足説明を表示
 * - 子要素を縦に配置
 */
export function FilterField({
  label,
  children,
  description,
  htmlFor,
  className,
}: FilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ============================================
// 型定義
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

// ============================================
// テキストフィルター
// ============================================

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

// ============================================
// セレクトフィルター
// ============================================

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

// ============================================
// 日付フィルター
// ============================================

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

// ============================================
// 日付範囲フィルター
// ============================================

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

// ============================================
// チェックボックスフィルター
// ============================================

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

// ============================================
// 数値範囲フィルター
// ============================================

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
