/**
 * InboundPlanInfoCard - Information card for inbound plan details.
 */
import { formatDate, formatDateTime } from "@/shared/utils/date";

interface InboundPlanInfoCardProps {
  plan: {
    plan_number: string;
    status: string;
    supplier_id: number;
    supplier_name?: string;
    planned_arrival_date: string;
    notes?: string | null;
    created_at: string;
    updated_at?: string | null;
  };
}

function StatusBadge({ status }: { status: string }) {
  const colorClass =
    status === "planned"
      ? "bg-yellow-100 text-yellow-800"
      : status === "received"
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-gray-800";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>
      {status}
    </span>
  );
}

export function InboundPlanInfoCard({ plan }: InboundPlanInfoCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">入荷予定情報</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-gray-500">入荷予定番号</div>
          <div className="mt-1 text-base">{plan.plan_number}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">ステータス</div>
          <div className="mt-1">
            <StatusBadge status={plan.status} />
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">仕入先</div>
          <div className="mt-1 text-base">{plan.supplier_name || `ID: ${plan.supplier_id}`}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">入荷予定日</div>
          <div className="mt-1 text-base">{formatDate(plan.planned_arrival_date)}</div>
        </div>
        {plan.notes && (
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-gray-500">備考</div>
            <div className="mt-1 text-base">{plan.notes}</div>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-500">作成日</div>
          <div className="mt-1 text-base">{formatDateTime(plan.created_at)}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">更新日</div>
          <div className="mt-1 text-base">
            {plan.updated_at ? formatDateTime(plan.updated_at) : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
