/**
 * SearchBar.tsx
 *
 * 検索バーコンポーネント
 * - テキスト検索
 * - クリアボタン
 * - デバウンス対応
 */

import { Search, X } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

export interface SearchBarProps {
  /** 検索値 */
  value: string;
  /** 検索値変更時のコールバック */
  onChange: (value: string) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** デバウンス時間(ms) */
  debounceMs?: number;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

// ============================================
// メインコンポーネント
// ============================================

export function SearchBar({
  value,
  onChange,
  placeholder = "検索...",
  debounceMs = 300,
  className,
  disabled = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  // useRefで最新のonChangeを保持し、無限ループを防ぐ
  const onChangeRef = useRef(onChange);

  // 外部からの値の変更を反映
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // onChangeRefを常に最新に保つ
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // デバウンス処理 (onChangeを依存配列から除外)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeRef.current(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, debounceMs]);

  // クリア処理
  const handleClear = useCallback(() => {
    setLocalValue("");
    onChangeRef.current("");
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {/* 検索アイコン */}
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />

        {/* 検索入力 */}
        <Input
          type="text"
          value={localValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-9 pl-9"
        />

        {/* クリアボタン */}
        {localValue && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
            aria-label="クリア"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// 即時反映版検索バー
// ============================================

export interface InstantSearchBarProps {
  /** 検索値 */
  value: string;
  /** 検索値変更時のコールバック */
  onChange: (value: string) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** クラス名 */
  className?: string;
  /** 無効化 */
  disabled?: boolean;
}

/**
 * 即時反映版検索バー
 * (デバウンスなし)
 */
export function InstantSearchBar({
  value,
  onChange,
  placeholder = "検索...",
  className,
  disabled = false,
}: InstantSearchBarProps) {
  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />

        <Input
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-9 pl-9"
        />

        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
            aria-label="クリア"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
