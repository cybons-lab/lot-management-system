import { format } from "date-fns";

interface InboundPlan {
    id: number;
    plan_number: string;
    supplier_name?: string;
    supplier_id: number;
    planned_arrival_date: string;
    status: string;
}

interface InboundPlanTableProps {
    plans: InboundPlan[];
}

export function InboundPlanTable({ plans }: InboundPlanTableProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="p-3 text-left font-medium text-gray-600">予定番号</th>
                        <th className="p-3 text-left font-medium text-gray-600">仕入先</th>
                        <th className="p-3 text-left font-medium text-gray-600">入荷予定日</th>
                        <th className="p-3 text-left font-medium text-gray-600">ステータス</th>
                    </tr>
                </thead>
                <tbody>
                    {plans.slice(0, 10).map((plan) => (
                        <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">{plan.plan_number}</td>
                            <td className="p-3">{plan.supplier_name || `ID:${plan.supplier_id}`}</td>
                            <td className="p-3">{format(new Date(plan.planned_arrival_date), "yyyy/MM/dd")}</td>
                            <td className="p-3">
                                <span
                                    className={`rounded px-2 py-1 text-xs font-medium ${plan.status === "received"
                                            ? "bg-green-100 text-green-700"
                                            : plan.status === "pending"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {plan.status === "received"
                                        ? "入荷済"
                                        : plan.status === "pending"
                                            ? "予定"
                                            : "キャンセル"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
