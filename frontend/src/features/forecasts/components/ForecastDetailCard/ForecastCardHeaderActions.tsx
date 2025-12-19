import { ChevronDown, RefreshCw, Wand2 } from "lucide-react";

import { type ForecastCardHeaderProps } from "./types";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

type ForecastCardHeaderActionsProps = Pick<
  ForecastCardHeaderProps,
  | "onAutoAllocate"
  | "onRegenerateSuggestions"
  | "onDelete"
  | "isDeleting"
  | "firstForecastId"
  | "isOpen"
>;

export function ForecastCardHeaderActions({
  onAutoAllocate,
  onRegenerateSuggestions,
  onDelete,
  isDeleting,
  firstForecastId,
  isOpen,
}: ForecastCardHeaderActionsProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2 pt-1">
      {onRegenerateSuggestions ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onRegenerateSuggestions();
          }}
          title="このグループの計画引当（Suggestions）を再計算します"
        >
          <RefreshCw className="h-3 w-3" />
          計画引当
        </Button>
      ) : null}

      {onAutoAllocate ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onAutoAllocate();
          }}
          title="このフォーキャストグループの関連受注にFEFO方式で在庫を引き当てます"
        >
          <Wand2 className="h-3 w-3" />
          受注引当
        </Button>
      ) : null}

      {onDelete && firstForecastId ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(firstForecastId);
          }}
          disabled={isDeleting}
        >
          削除
        </Button>
      ) : null}

      <div className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </div>
    </div>
  );
}
