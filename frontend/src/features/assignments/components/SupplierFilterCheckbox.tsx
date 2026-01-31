/**
 * SupplierFilterCheckbox - 担当仕入先フィルタのチェックボックス
 *
 * 担当仕入先のみを表示するかどうかを切り替えるチェックボックスコンポーネント
 */

import { User } from "lucide-react";

interface SupplierFilterCheckboxProps {
  /** フィルタの有効/無効状態 */
  enabled: boolean;
  /** フィルタ状態が変更されたときのコールバック */
  onToggle: (enabled: boolean) => void;
  /** チェックボックスのラベル（デフォルト: "担当仕入先のみ"） */
  label?: string;
  /** 無効化するかどうか */
  disabled?: boolean;
}

/**
 * 担当仕入先フィルタのチェックボックス
 */
export function SupplierFilterCheckbox({
  enabled,
  onToggle,
  label = "担当仕入先のみ",
  disabled = false,
}: SupplierFilterCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id="supplier-filter-checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <label
        htmlFor="supplier-filter-checkbox"
        className={`flex items-center gap-1 text-sm font-medium ${
          disabled ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"
        }`}
      >
        <User className={`h-3.5 w-3.5 ${disabled ? "text-slate-400" : "text-blue-600"}`} />
        {label}
      </label>
    </div>
  );
}
