import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";

interface InboundPlansTabProps {
  productId: number;
  warehouseId: number;
}

export function InboundPlansTab(_props: InboundPlansTabProps) {
  const { data: allPlans, isLoading } = useQuery({
    queryKey: ["inbound-plans"],
    queryFn: async () => {
      const { getInboundPlans } = await import("@/features/inbound-plans/api");
      return getInboundPlans({});
    },
  });

  // Filter plans that have lines for this product
  const relevantPlans =
    allPlans?.filter(() => {
      // Note: We would need to fetch plan details to filter by product_id
      // For now, show all plans (to be improved with backend filtering)
      return true;
    }) || [];

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">入荷予定</h3>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.INBOUND_PLANS.LIST)}>
          入荷予定一覧へ
        </Button>
      </div>

      {relevantPlans.length > 0 ? (
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
              {relevantPlans.slice(0, 10).map((plan) => (
                <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{plan.plan_number}</td>
                  <td className="p-3">{plan.supplier_name || `ID:${plan.supplier_id}`}</td>
                  <td className="p-3">
                    {format(new Date(plan.planned_arrival_date), "yyyy/MM/dd")}
                  </td>
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
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">入荷予定がありません</p>
        </div>
      )}

      {relevantPlans.length > 10 && (
        <p className="text-sm text-gray-500">
          {relevantPlans.length - 10}件の入荷予定が他にあります
        </p>
      )}
    </div>
  );
}
