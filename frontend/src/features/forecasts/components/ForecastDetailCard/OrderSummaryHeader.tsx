import { ChevronDown, ChevronRight, ExternalLink, Send } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useSAPRegistration } from "@/features/forecasts/hooks/useSAPRegistration";
import { cn } from "@/shared/libs/utils";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { type OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface OrderSummaryHeaderProps {
  order: OrderWithLinesResponse;
  targetLines: OrderLine[];
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
  const { sapOrderNo, registerToSAP, isRegistering } = useSAPRegistration(order.id);

  return (
    <div
      className={cn(
        "flex items-center gap-4 py-2 transition-colors",
        isHovered ? "bg-yellow-50" : "hover:bg-slate-50",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <HeaderLeftSection
        order={order}
        targetLines={targetLines}
        isExpanded={isExpanded}
        isHovered={isHovered}
        onToggleExpand={onToggleExpand}
      />

      <HeaderRightSection
        order={order}
        targetLines={targetLines}
        totalRequired={totalRequired}
        totalAllocated={totalAllocated}
        statusLabel={statusLabel}
        statusColor={statusColor}
        sapOrderNo={sapOrderNo}
        isRegistering={isRegistering}
        onRegisterToSAP={registerToSAP}
      />
    </div>
  );
}

function HeaderLeftSection({
  order,
  targetLines,
  isExpanded,
  isHovered,
  onToggleExpand,
}: {
  order: OrderWithLinesResponse;
  targetLines: OrderLine[];
  isExpanded: boolean;
  isHovered: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
        onClick={onToggleExpand}
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
  );
}

function HeaderRightSection({
  order,
  targetLines,
  totalRequired,
  totalAllocated,
  statusLabel,
  statusColor,
  sapOrderNo,
  isRegistering,
  onRegisterToSAP,
}: {
  order: OrderWithLinesResponse;
  targetLines: OrderLine[];
  totalRequired: number;
  totalAllocated: number;
  statusLabel: string;
  statusColor: string;
  sapOrderNo: string | null;
  isRegistering: boolean;
  onRegisterToSAP: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <QuantityAndStatusSection
        targetLines={targetLines}
        totalRequired={totalRequired}
        totalAllocated={totalAllocated}
        statusLabel={statusLabel}
        statusColor={statusColor}
      />

      <SAPActionsSection
        order={order}
        sapOrderNo={sapOrderNo}
        isRegistering={isRegistering}
        onRegisterToSAP={onRegisterToSAP}
      />
    </div>
  );
}

function QuantityAndStatusSection({
  targetLines,
  totalRequired,
  totalAllocated,
  statusLabel,
  statusColor,
}: {
  targetLines: OrderLine[];
  totalRequired: number;
  totalAllocated: number;
  statusLabel: string;
  statusColor: string;
}) {
  return (
    <>
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

      <Badge className={cn("h-5 px-1.5 text-[10px] font-normal", statusColor)}>{statusLabel}</Badge>
    </>
  );
}

function SAPActionsSection({
  order,
  sapOrderNo,
  isRegistering,
  onRegisterToSAP,
}: {
  order: OrderWithLinesResponse;
  sapOrderNo: string | null;
  isRegistering: boolean;
  onRegisterToSAP: () => void;
}) {
  const isSAPRegistered = Boolean(sapOrderNo);

  return (
    <>
      {/* SAP Status Badge */}
      {isSAPRegistered ? (
        <Badge
          variant="outline"
          className="h-5 border-green-200 bg-green-50 px-1.5 text-[10px] text-green-700"
        >
          SAP登録済み
        </Badge>
      ) : (
        <>
          <Badge variant="outline" className="h-5 bg-gray-50 px-1.5 text-[10px] text-gray-600">
            SAP未登録
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-xs hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            onClick={(e) => {
              e.stopPropagation();
              onRegisterToSAP();
            }}
            disabled={isRegistering}
          >
            <Send className="h-3 w-3" />
            {isRegistering ? "登録中..." : "SAP登録"}
          </Button>
        </>
      )}

      {/* SAP Order Number if registered */}
      {isSAPRegistered && sapOrderNo && (
        <span className="font-mono text-xs text-green-700">SAP: {sapOrderNo}</span>
      )}

      <Link
        to={ROUTES.ORDERS.DETAIL(order.id.toString())}
        className="text-gray-400 hover:text-blue-600"
        title="受注詳細ページへ"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    </>
  );
}
