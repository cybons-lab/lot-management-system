import { Button } from "@/components/ui/button";
import { cn } from "@/shared/libs/utils";

interface LotActionsProps {
  onFill: () => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
  hasInput: boolean;
}

export function LotActions({ onFill, onSave, canSave, isSaving, hasInput }: LotActionsProps) {
  const isReadyToSave = hasInput && canSave;

  return (
    <div className="flex items-center gap-2">
      {/* 全量ボタン */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onFill}
        disabled={isSaving}
        className="h-9 text-xs"
      >
        全量
      </Button>

      {/* 保存ボタン */}
      <Button
        type="button"
        size="sm"
        variant={isReadyToSave ? "default" : "ghost"}
        onClick={onSave}
        disabled={!isReadyToSave}
        className={cn(
          "h-9 min-w-[60px] transition-colors",
          isReadyToSave
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "text-gray-400 hover:bg-gray-100",
        )}
      >
        保存
      </Button>
    </div>
  );
}
