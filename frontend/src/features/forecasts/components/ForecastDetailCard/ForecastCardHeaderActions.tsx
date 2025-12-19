import { ChevronDown, RefreshCw, Trash2, Wand2 } from "lucide-react";

import { type ForecastCardHeaderProps } from "./types";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

type ForecastCardHeaderActionsProps = Pick<
  ForecastCardHeaderProps,
  | "onAutoAllocate"
  | "onRegenerateSuggestions"
  | "onClearSuggestions"
  | "onDelete"
  | "firstForecastId"
  | "isOpen"
>;

interface HeaderActionButtonProps extends React.ComponentProps<typeof Button> {
  icon: React.ElementType;
  label: string;
  onClickAction: () => void;
}

function HeaderActionButton({
  icon: Icon,
  label,
  onClickAction,
  className,
  ...props
}: HeaderActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-7 gap-1 px-2 text-xs", className)}
      onClick={(event) => {
        event.stopPropagation();
        onClickAction();
      }}
      {...props}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Button>
  );
}

export function ForecastCardHeaderActions({
  onAutoAllocate,
  onRegenerateSuggestions,
  onClearSuggestions,
  onDelete,
  firstForecastId,
  isOpen,
}: ForecastCardHeaderActionsProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2 pt-1">
      {onRegenerateSuggestions && (
        <HeaderActionButton
          icon={RefreshCw}
          label="計画引当"
          onClickAction={onRegenerateSuggestions}
          title="このグループの計画引当（Suggestions）を再計算します"
        />
      )}

      {onClearSuggestions && (
        <HeaderActionButton
          icon={Trash2}
          label="クリア"
          onClickAction={onClearSuggestions}
          className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          title="このグループの計画引当を削除します"
        />
      )}

      {onAutoAllocate && (
        <HeaderActionButton
          icon={Wand2}
          label="受注引当"
          onClickAction={onAutoAllocate}
          title="このフォーキャストグループの関連受注にFEFO方式で在庫を引き当てます"
        />
      )}

      {onDelete && firstForecastId && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(firstForecastId);
          }}
          disabled={true}
          title="管理者のみ削除可能です"
        >
          削除
        </Button>
      )}

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
