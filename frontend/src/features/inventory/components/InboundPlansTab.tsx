import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { InboundPlanTable } from "./InboundPlanTable";

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
        <InboundPlanTable plans={relevantPlans} />
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
