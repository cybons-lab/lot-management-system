import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import type { OrderLineUI, OrderUI } from "@/shared/libs/normalize";
import { formatDate } from "@/shared/utils/date";

interface OrderInfoColumnsProps {
  order: OrderUI;
  lines: OrderLineUI[];
  allocationRate: number;
}

function InfoColumn({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function AllocationRateColumn({ allocationRate }: { allocationRate: number }) {
  const progressClass =
    allocationRate === 100 ? "bg-green-500" : allocationRate > 0 ? "bg-blue-500" : "bg-slate-300";

  return (
    <InfoColumn title="引当状況" className="w-[200px]">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${progressClass}`}
            style={{ width: `${allocationRate}%` }}
          />
        </div>
        <span className="text-sm font-medium text-slate-700">{allocationRate.toFixed(0)}%</span>
      </div>
    </InfoColumn>
  );
}

function OrderActions({ order }: { order: OrderUI }) {
  const openAllocation = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    window.location.href = `/allocation?selected=${order.id}`;
  };

  const sendSap = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    toast.success("SAP連携データを送信しました(Mock)");
  };

  return (
    <div className="flex w-[140px] items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={openAllocation}
        className="h-8 w-8 p-0"
        title="引当画面へ"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      {order.status === "allocated" && (
        <Button variant="outline" size="sm" onClick={sendSap} className="text-xs">
          SAP送信
        </Button>
      )}
    </div>
  );
}

export function OrderInfoColumns({ order, lines, allocationRate }: OrderInfoColumnsProps) {
  return (
    <div className="flex flex-1 items-center gap-6">
      <InfoColumn title="受注番号" className="w-[150px]">
        <div className="font-semibold text-slate-900">{order.order_no}</div>
      </InfoColumn>

      <InfoColumn title="得意先" className="w-[180px]">
        <div className="font-semibold text-slate-900">{order.customer_code}</div>
        {order.customer_name && (
          <div className="truncate text-xs text-slate-600" title={order.customer_name}>
            {order.customer_name}
          </div>
        )}
      </InfoColumn>

      <InfoColumn title="受注日" className="w-[120px]">
        <div className="font-semibold text-slate-900">{formatDate(order.order_date)}</div>
      </InfoColumn>

      <InfoColumn title="明細数" className="w-[80px] text-right">
        <div className="font-semibold text-slate-900">{lines.length}</div>
      </InfoColumn>

      <AllocationRateColumn allocationRate={allocationRate} />

      <InfoColumn title="ステータス" className="w-[100px]">
        <OrderStatusBadge status={order.status} />
      </InfoColumn>

      <OrderActions order={order} />
    </div>
  );
}
