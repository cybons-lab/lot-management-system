import { ChevronDown, Wand2 } from "lucide-react";

import { type ForecastCardHeaderProps } from "./types";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

type ForecastCardHeaderActionsProps = Pick<
    ForecastCardHeaderProps,
    "onAutoAllocate" | "onDelete" | "isDeleting" | "firstForecastId" | "isOpen"
>;

export function ForecastCardHeaderActions({
    onAutoAllocate,
    onDelete,
    isDeleting,
    firstForecastId,
    isOpen,
}: ForecastCardHeaderActionsProps) {
    return (
        <div className="flex flex-shrink-0 items-center gap-2 pt-1">
            {onAutoAllocate ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={(event) => {
                        event.stopPropagation();
                        onAutoAllocate();
                    }}
                    title="このフォーキャストグループの全受注に対して自動引当を実行します（未実装）"
                >
                    <Wand2 className="h-3 w-3" />
                    自動引当
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
