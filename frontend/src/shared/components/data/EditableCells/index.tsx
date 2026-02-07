import { type KeyboardEvent, useEffect, useRef } from "react";

import { cn } from "@/shared/libs/utils";

export interface EditableCellProps {
  value: string;
  isActive: boolean;
  isDisabled?: boolean | undefined;
  hasWarning?: boolean | undefined;
  hasError?: boolean | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  inputClassName?: string | undefined;
  /** セルが2番目の項目（サブ項目）かどうか。スタイル調整に使用。 */
  isSecondary?: boolean | undefined;
  onUpdate: (value: string) => void;
  onBlur?: (() => void) | undefined;
  onKeyDown?: ((event: KeyboardEvent<HTMLInputElement>) => void) | undefined;
  onActivate: () => void;
  /** コンポジション（IME入力）状態の変更通知 */
  onCompositionChange?: ((isComposing: boolean) => void) | undefined;
}

/**
 * 汎用的な編集可能テキストセル
 */
// eslint-disable-next-line max-lines-per-function, complexity -- 編集可能セルのIME・フォーカス制御ロジックを1箇所で管理するため
export function EditableTextCell({
  value,
  isActive,
  isDisabled,
  hasWarning,
  hasError,
  placeholder,
  className,
  inputClassName,
  isSecondary,
  onUpdate,
  onBlur,
  onKeyDown,
  onActivate,
  onCompositionChange,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (!becameActive) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      inputRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }, [isActive]);

  const handleCompositionStart = () => {
    onCompositionChange?.(true);
  };

  const handleCompositionEnd = () => {
    onCompositionChange?.(false);
  };

  if (isActive) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onUpdate(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border bg-white px-2 py-0.5 text-sm shadow-sm outline-none transition focus:ring-2",
          hasWarning || hasError
            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-400 focus:ring-blue-200",
          inputClassName,
        )}
        disabled={isDisabled}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onActivate()}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === "Enter" || e.key === "F2")) {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "group flex w-full rounded-md px-2 py-0.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 border cursor-text items-center",
        !value &&
          !hasWarning &&
          (isSecondary
            ? "border-dashed border-slate-200 bg-slate-50/20"
            : "border-dashed border-slate-300 bg-slate-50/30"),
        value && !hasWarning && "bg-transparent border-transparent",
        "hover:bg-white hover:border-slate-300 hover:border-solid",
        hasWarning ? "text-red-700 bg-red-50/60 border-red-200 border-solid" : "text-slate-700",
        isDisabled && "cursor-not-allowed opacity-60",
        className,
      )}
      disabled={isDisabled}
    >
      {value ? (
        <span>{value}</span>
      ) : (
        <span className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {placeholder || "\u00A0"}
        </span>
      )}
    </button>
  );
}

/**
 * 汎用的な編集可能日付セル
 */
export function EditableDateCell({
  value,
  isActive,
  isDisabled,
  hasWarning,
  hasError,
  className,
  inputClassName,
  onUpdate,
  onBlur,
  onKeyDown,
  onActivate,
  onCompositionChange,
  title,
}: Omit<EditableCellProps, "placeholder"> & { title?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (!becameActive) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      inputRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }, [isActive]);

  if (isActive) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onUpdate(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onCompositionStart={() => onCompositionChange?.(true)}
        onCompositionEnd={() => onCompositionChange?.(false)}
        title={title}
        className={cn(
          "w-full rounded-md border bg-white px-2 py-0.5 text-sm shadow-sm outline-none transition focus:ring-2",
          hasWarning || hasError
            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-400 focus:ring-blue-200",
          inputClassName,
        )}
        disabled={isDisabled}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onActivate()}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === "Enter" || e.key === "F2")) {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "group flex w-full rounded-md px-2 py-0.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 border cursor-text items-center",
        !value && !hasWarning && "border-dashed border-slate-300 bg-slate-50/30",
        value && !hasWarning && "bg-transparent border-transparent",
        "hover:bg-white hover:border-slate-300 hover:border-solid",
        hasWarning ? "text-red-700 bg-red-50/60 border-red-200 border-solid" : "text-slate-700",
        isDisabled && "cursor-not-allowed opacity-60",
        className,
      )}
      disabled={isDisabled}
      title={title}
    >
      {value || "\u00A0"}
    </button>
  );
}
