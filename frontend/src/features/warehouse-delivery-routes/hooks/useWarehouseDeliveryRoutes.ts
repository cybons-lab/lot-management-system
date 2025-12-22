import type {
  WarehouseDeliveryRoute,
  WarehouseDeliveryRouteCreate,
  WarehouseDeliveryRouteUpdate,
} from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useWarehouseDeliveryRoutes = () => {
  return useMasterApi<
    WarehouseDeliveryRoute,
    WarehouseDeliveryRouteCreate,
    WarehouseDeliveryRouteUpdate
  >("masters/warehouse-delivery-routes", "warehouse-delivery-routes");
};
