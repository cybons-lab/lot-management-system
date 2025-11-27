import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/shared/libs/utils";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface OrderSummaryHeaderProps {
    order: OrderWithLinesResponse;
    targetLines: any[]; // OrderLine[]
    isExpanded: boolean;
    isHovered: boolean;
    totalRequired: number;
    totalAllocated: number;
    statusLabel: string;
    statusColor: string;
    onToggleExpand: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export function OrderSummaryHeader({
    order,
    targetLines,
    isExpanded,
    isHovered,
    totalRequired,
    totalAllocated,
    statusLabel,
    statusColor,
    onToggleExpand,
    onMouseEnter,
    onMouseLeave,
}: OrderSummaryHeaderProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-4 py-2 transition-colors",
                isHovered ? "bg-yellow-50" : "hover:bg-slate-50",
            )}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    onClick={onToggleExpand}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>

                <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium text-gray-700">
                        {order.order_number || `ORD-${order.id}`}
                    </span>
                    <span className="hidden text-xs text-gray-500 sm:inline">{order.customer_name}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className={cn("text-xs text-gray-600", isHovered && "font-bold text-gray-900")}>
                        納期: {targetLines[0]?.delivery_date ? formatDate(targetLines[0].delivery_date) : "-"}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-500">明細: {targetLines.length}件</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">必要</span>
                    <span className="text-sm font-medium">
                        {formatQuantity(totalRequired, targetLines[0]?.unit || "")}
                    </span>
                    <span className="text-xs text-gray-300">/</span>
                    <span className="text-xs text-gray-500">引当</span>
                    <span className={cn("text-sm font-medium", totalAllocated > 0 ? "text-blue-600" : "")}>
                        {formatQuantity(totalAllocated, targetLines[0]?.unit || "")}
                    </span>
                    <span className="text-xs text-gray-400">{targetLines[0]?.unit}</span>
                </div>

                <Badge className={cn("h-5 px-1.5 text-[10px] font-normal", statusColor)}>
                    {statusLabel}
                </Badge>

                <Link
                    to={ROUTES.ORDERS.DETAIL(order.id.toString())}
                    className="text-gray-400 hover:text-blue-600"
                    title="受注詳細ページへ"
                >
                    <ExternalLink className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
