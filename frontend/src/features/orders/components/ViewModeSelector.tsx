import { Button } from "@/components/ui";

type ViewMode = "delivery" | "flat" | "order";

interface ViewModeSelectorProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

/**
 * ビューモード切り替えボタン
 */
export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant={viewMode === "delivery" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("delivery")}
                className="min-w-[120px]"
            >
                納入先単位
            </Button>
            <Button
                variant={viewMode === "flat" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("flat")}
                className="min-w-[120px]"
            >
                1行単位
            </Button>
            <Button
                variant={viewMode === "order" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("order")}
                className="min-w-[120px]"
            >
                受注単位
            </Button>
        </div>
    );
}
