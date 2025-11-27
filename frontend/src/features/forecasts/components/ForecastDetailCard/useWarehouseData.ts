import { useInboundPlans } from "@/features/inbound-plans/hooks";
import { useLotsQuery } from "@/hooks/api";

export interface WarehouseData {
  name: string;
  inventory: {
    total: number;
    lotCount: number;
    unit: string;
  };
  upcomingInbounds: Array<{
    date: string;
    quantity: number;
  }>;
}

export function useWarehouseData(productId: number) {
  const { data: inboundPlans, isLoading: isLoadingInbound } = useInboundPlans({
    product_id: productId,
  });
  const { data: lots = [], isLoading: isLoadingLots } = useLotsQuery({ product_id: productId });

  const isLoading = isLoadingInbound || isLoadingLots;

  // ロットデータから倉庫別に集約
  const warehouseMap = new Map<string, WarehouseData>();

  lots.forEach((lot) => {
    const warehouseName = String(lot.delivery_place_name || lot.delivery_place_code || "不明");
    const quantity = Number(lot.current_quantity || 0);
    const unit = String(lot.unit || "EA");

    if (!warehouseMap.has(warehouseName)) {
      warehouseMap.set(warehouseName, {
        name: warehouseName,
        inventory: { total: 0, lotCount: 0, unit },
        upcomingInbounds: [],
      });
    }

    const warehouse = warehouseMap.get(warehouseName)!;
    warehouse.inventory.total += quantity;
    warehouse.inventory.lotCount += 1;
  });

  const warehouseData: WarehouseData[] = Array.from(warehouseMap.values());

  // 直近の入荷予定を取得（未来の日付のみ）
  const today = new Date();
  const upcomingPlans = Array.isArray(inboundPlans)
    ? inboundPlans.filter((plan) => new Date(plan.planned_arrival_date) >= today)
    : [];

  // TODO: 入荷予定を倉庫別に集約する処理を実装
  // 現在は入荷予定が倉庫情報を持っていないため、最初の倉庫に表示
  if (upcomingPlans.length > 0 && warehouseData.length > 0) {
    warehouseData[0].upcomingInbounds = upcomingPlans.slice(0, 3).map((plan) => ({
      date: plan.planned_arrival_date,
      quantity: 0, // TODO: 入荷予定の数量を取得
    }));
  }

  return { warehouseData, isLoading };
}
