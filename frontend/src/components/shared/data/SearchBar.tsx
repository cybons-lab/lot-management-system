/**
 * SearchBar.tsx
 * 
 * 検索バーコンポーネント
 * - テキスト検索
 * - クリアボタン
 * - デバウンス対応
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  placeholder = '検索...',
  debounceMs = 300,
  className,
  disabled = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // 外部からの値の変更を反映
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  // クリア処理
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        {/* 検索アイコン */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

        {/* 検索入力 */}
        <Input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
        />

        {/* クリアボタン */}
        {localValue && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
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
  placeholder = '検索...',
  className,
  disabled = false,
}: InstantSearchBarProps) {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
        />

        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            aria-label="クリア"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
