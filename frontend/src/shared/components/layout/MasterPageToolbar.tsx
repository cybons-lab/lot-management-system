import { type ChangeEvent, type ReactNode } from "react";

import { Input } from "@/components/ui/input";

interface MasterPageToolbarProps {
  title?: string | undefined;
  searchQuery?: string | undefined;
  onSearchQueryChange?: ((value: string) => void) | undefined;
  searchPlaceholder?: string | undefined;
  leftControls?: ReactNode | undefined;
  rightControls?: ReactNode | undefined;
}

export function MasterPageToolbar({
  title,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "検索...",
  leftControls,
  rightControls,
}: MasterPageToolbarProps) {
  const hasToolbar = title || onSearchQueryChange || leftControls || rightControls;

  if (!hasToolbar) return null;

  return (
    <div className="flex items-center justify-between border-b bg-slate-50/50 px-4 py-3">
      <div className="flex items-center gap-4">
        {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
        {leftControls}
      </div>
      <div className="flex items-center gap-4">
        {rightControls}
        {onSearchQueryChange && (
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchQueryChange(e.target.value)}
            className="w-64 bg-white"
          />
        )}
      </div>
    </div>
  );
}
