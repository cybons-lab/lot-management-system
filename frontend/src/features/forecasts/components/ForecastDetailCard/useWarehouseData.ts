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

type WarehouseSource = {
  warehouse_name?: string;
  warehouse_code?: string;
  warehouse_id?: number;
};

type InboundPlanLineLike = WarehouseSource & {
  product_id?: number;
  planned_quantity?: number | string;
  unit?: string;
};

type InboundPlanLike = WarehouseSource & {
  planned_arrival_date?: string;
  total_quantity?: number | string;
  unit?: string;
  lines?: InboundPlanLineLike[];
};

const getWarehouseKey = (source: WarehouseSource) =>
  String(
    source.warehouse_name ??
      source.warehouse_code ??
      (source.warehouse_id ? `ID:${source.warehouse_id}` : "未指定"),
  );

export function useWarehouseData(productId: number) {
  const { data: inboundPlans, isLoading: isLoadingInbound } = useInboundPlans({
    product_id: productId,
  });
  const { data: lots = [], isLoading: isLoadingLots } = useLotsQuery({ product_id: productId });

  const isLoading = isLoadingInbound || isLoadingLots;

  // ロットデータから倉庫別に集約
  const warehouseMap = new Map<string, WarehouseData>();

  lots.forEach((lot) => {
    const warehouseName = String(lot.warehouse_name || lot.warehouse_code || "不明");
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



  // 直近の入荷予定を取得（未来の日付のみ）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingPlans = Array.isArray(inboundPlans)
    ? inboundPlans.filter((plan) => {
        const plannedDate = new Date(plan.planned_arrival_date);
        return !Number.isNaN(plannedDate.getTime()) && plannedDate >= today;
      })
    : [];

  const inboundPlansByWarehouse = upcomingPlans as InboundPlanLike[];

  inboundPlansByWarehouse.forEach((plan) => {
    const lines = Array.isArray(plan.lines) ? plan.lines : [];
    const relevantLines =
      lines.length > 0
        ? lines.filter((line) => !line.product_id || line.product_id === productId)
        : [plan];

    relevantLines.forEach((line) => {
      const warehouseName = getWarehouseKey(line);
      const unit = String(line.unit || "EA");

      if (!warehouseMap.has(warehouseName)) {
        warehouseMap.set(warehouseName, {
          name: warehouseName,
          inventory: { total: 0, lotCount: 0, unit },
          upcomingInbounds: [],
        });
      }

      const warehouse = warehouseMap.get(warehouseName)!;
      if (warehouse.inventory.unit === "EA" && unit) {
        warehouse.inventory.unit = unit;
      }
      warehouse.upcomingInbounds.push({
        date: plan.planned_arrival_date ?? "",
        quantity: Number(
          "planned_quantity" in line
            ? line.planned_quantity ?? 0
            : plan.total_quantity ?? 0,
        ),
      });
    });
  });

  const inboundLimit = 3;
  warehouseMap.forEach((warehouse) => {
    warehouse.upcomingInbounds = warehouse.upcomingInbounds
      .filter((inbound) => inbound.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, inboundLimit);
  });

  return { warehouseData: Array.from(warehouseMap.values()), isLoading };
}
