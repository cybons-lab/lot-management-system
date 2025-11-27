import { Trash2 } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { type OrderLine } from "@/shared/types/aliases";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface LotActionSectionProps {
    currentQty: number;
    remainingInLot: number;
    freeQty: number;
    line: OrderLine;
    limit: number;
    isConfirmed: boolean;
    isShaking: boolean;
    isLocked: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFull: () => void;
    onConfirm: () => void;
    onClear: () => void;
}

export function LotActionSection({
    currentQty,
    remainingInLot,
    freeQty,
    line,
    limit,
    isConfirmed,
    isShaking,
    isLocked,
    onInputChange,
    onFull,
    onConfirm,
    onClear,
}: LotActionSectionProps) {
    return (
        <div className="flex shrink-0 items-center gap-x-3">
            <div className="min-w-[140px] text-right">
                <div className="text-xs font-bold text-gray-400">残量 / 総量</div>
                <div className="text-sm font-bold text-gray-900">
                    {formatQuantity(remainingInLot, line.unit || "PCS")} /{" "}
                    {formatQuantity(freeQty, line.unit || "PCS")} {line.unit}
                </div>
            </div>

            <div className="h-8 w-px shrink-0 bg-gray-100" />

            <div className="flex items-center gap-1">
                <Input
                    type="number"
                    className={cn(
                        "h-8 w-20 text-center text-sm font-bold transition-all",
                        isConfirmed
                            ? "border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
                            : currentQty > 0
                                ? "border-orange-500 text-orange-700 ring-1 ring-orange-500/20"
                                : "border-gray-300 text-gray-900",
                        isShaking && "animate-shake border-red-500 text-red-600 ring-red-500",
                    )}
                    value={currentQty > 0 ? currentQty : ""}
                    placeholder="0"
                    onChange={onInputChange}
                    min={0}
                    max={limit}
                />
                <span className="text-xs text-gray-500">{line.unit}</span>
            </div>

            <div className="flex items-center gap-1 rounded-md bg-gray-50 p-1">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={onFull}
                    disabled={freeQty <= 0 || isLocked}
                    title="不足分をこのロットで埋める"
                >
                    全量
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 px-2 text-xs",
                        isConfirmed && "border-blue-300 bg-blue-50 text-blue-700",
                    )}
                    onClick={onConfirm}
                    disabled={currentQty === 0}
                >
                    引確
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 w-8 p-0 text-gray-500 transition-colors",
                        "border border-gray-300 bg-white shadow-sm",
                        "hover:border-red-300 hover:bg-red-50 hover:text-red-600",
                        currentQty === 0 && "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50",
                    )}
                    onClick={onClear}
                    disabled={currentQty === 0}
                    title="クリア"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
