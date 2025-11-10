/**
 * FormField.tsx
 *
 * フォーム項目コンポーネント
 * - ラベル付き入力フィールド
 * - エラー表示
 * - 必須マーク
 * - ヘルプテキスト
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

export interface BaseFormFieldProps {
  /** フィールドのラベル */
  label: string;
  /** フィールドID */
  id?: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  helpText?: string;
  /** クラス名 */
  className?: string;
}

// ============================================
// テキストフィールド
// ============================================

export interface TextFormFieldProps extends BaseFormFieldProps {
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** 入力タイプ */
  type?: "text" | "email" | "password" | "tel" | "url" | "number";
  /** 無効化 */
  disabled?: boolean;
}

export function TextFormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
  helpText,
  disabled = false,
  className,
}: TextFormFieldProps) {
  const fieldId = id || label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(error && "border-red-500")}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}

// ============================================
// テキストエリアフィールド
// ============================================

export interface TextareaFormFieldProps extends BaseFormFieldProps {
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** 行数 */
  rows?: number;
  /** 無効化 */
  disabled?: boolean;
}

export function TextareaFormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
  helpText,
  disabled = false,
  className,
}: TextareaFormFieldProps) {
  const fieldId = id || label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Textarea
        id={fieldId}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(error && "border-red-500")}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}

// ============================================
// セレクトフィールド
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFormFieldProps extends BaseFormFieldProps {
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** 選択肢 */
  options: SelectOption[];
  /** プレースホルダー */
  placeholder?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function SelectFormField({
  label,
  id,
  value,
  onChange,
  options,
  placeholder = "選択してください",
  required = false,
  error,
  helpText,
  disabled = false,
  className,
}: SelectFormFieldProps) {
  const fieldId = id || label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={fieldId} className={cn(error && "border-red-500")}>
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
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}

// ============================================
// 日付フィールド
// ============================================

export interface DateFormFieldProps extends BaseFormFieldProps {
  /** 値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** 無効化 */
  disabled?: boolean;
}

export function DateFormField({
  label,
  id,
  value,
  onChange,
  required = false,
  error,
  helpText,
  disabled = false,
  className,
}: DateFormFieldProps) {
  const fieldId = id || label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        id={fieldId}
        type="date"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(error && "border-red-500")}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}

// ============================================
// 数値フィールド
// ============================================

export interface NumberFormFieldProps extends BaseFormFieldProps {
  /** 値 */
  value: number | string;
  /** 変更時のコールバック */
  onChange: (value: number | string) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** 最小値 */
  min?: number;
  /** 最大値 */
  max?: number;
  /** ステップ */
  step?: number;
  /** 無効化 */
  disabled?: boolean;
}

export function NumberFormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  required = false,
  error,
  helpText,
  disabled = false,
  className,
}: NumberFormFieldProps) {
  const fieldId = id || label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        id={fieldId}
        type="number"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(error && "border-red-500")}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  );
}
