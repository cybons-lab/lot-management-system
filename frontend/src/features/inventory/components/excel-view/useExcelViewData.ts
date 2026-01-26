import { useMemo } from "react";

import {
  type ExcelViewData,
  type LotBlockData,
  type DestinationRowData,
  type DestinationInfo,
  type LotInfo,
} from "./types";

import { type AllocationSuggestionResponse } from "@/features/allocations/api";
import { useAllocationSuggestions } from "@/features/allocations/hooks/api/useAllocationSuggestions";
import { type Customer } from "@/features/customers/api";
import { type DeliveryPlace } from "@/features/delivery-places/api";
import { useInventoryItem } from "@/features/inventory/hooks";
import { useLotsQuery } from "@/hooks/api";
import { useMasterApi } from "@/shared/hooks/useMasterApi";
import { type LotUI } from "@/shared/libs/normalize";

interface MapContext {
  dpMap: Map<number, DeliveryPlace>;
  customerMap: Map<number, Customer>;
  suggestions: AllocationSuggestionResponse[];
  productCode: string;
}

const getShipmentByDate = (
  lotId: number,
  dpId: number,
  suggestions: AllocationSuggestionResponse[],
): { shipmentQtyByDate: Record<string, number>; totalShipmentQty: number } => {
  const lotDestSuggestions = suggestions.filter(
    (s) => s.lot_id === lotId && s.delivery_place_id === dpId,
  );
  const shipmentQtyByDate: Record<string, number> = {};
  let totalShipmentQty = 0;
  lotDestSuggestions.forEach((s) => {
    const qty = Number(s.quantity);
    if (s.forecast_period) {
      shipmentQtyByDate[s.forecast_period] = (shipmentQtyByDate[s.forecast_period] || 0) + qty;
    }
    totalShipmentQty += qty;
  });
  return { shipmentQtyByDate, totalShipmentQty };
};

const getDestinationInfo = (dpId: number, context: MapContext): DestinationInfo => {
  const { dpMap, customerMap, productCode } = context;
  const dp = dpMap.get(dpId);
  const customer = customerMap.get(dp?.customer_id || 0);
  return {
    deliveryPlaceName: dp?.delivery_place_name || `Unknown (${dpId})`,
    customerName: customer?.customer_name || "-",
    customerCode: customer?.customer_code || "-",
    deliveryPlaceCode: dp?.delivery_place_code || "-",
    customerPartNo: "-",
    makerPartNo: productCode,
    deliveryType: "-",
    coaRecipient: "-",
  };
};

const mapDestinationRow = (
  dpId: number,
  lotId: number,
  context: MapContext,
): DestinationRowData => {
  const { suggestions, dpMap } = context;
  const { shipmentQtyByDate, totalShipmentQty } = getShipmentByDate(lotId, dpId, suggestions);
  const dp = dpMap.get(dpId);
  return {
    deliveryPlaceId: dpId,
    customerId: dp?.customer_id || 0,
    destination: getDestinationInfo(dpId, context),
    shipmentQtyByDate,
    totalShipmentQty,
  };
};

const getLotInfo = (lot: LotUI): LotInfo => ({
  inboundDate: lot.received_date ? String(lot.received_date).substring(0, 10) : "-",
  lotNo: lot.lot_number,
  inboundNo: lot.lot_number,
  orderNo: "-",
  expiryDate: lot.expiry_date ? String(lot.expiry_date).substring(0, 10) : "期限なし",
  inboundQty: Number(lot.current_quantity),
  unit: lot.unit || "g",
});

const mapLotBlock = (lot: LotUI, context: MapContext): LotBlockData => {
  const lotId = lot.lot_id;
  const lotSuggestions = context.suggestions.filter((s) => s.lot_id === lotId);
  const dpIds = Array.from(new Set(lotSuggestions.map((s) => s.delivery_place_id)));
  const destinations = dpIds.map((dpId) => mapDestinationRow(dpId, lotId, context));
  const totalShipment = destinations.reduce((sum, d) => sum + d.totalShipmentQty, 0);
  return {
    lotId,
    lotInfo: getLotInfo(lot),
    destinations,
    totalShipment,
    totalStock: Number(lot.current_quantity),
  };
};

export function useExcelViewData(productId: number, warehouseId: number) {
  const { data: inventoryItem, isLoading: itemLoading } = useInventoryItem(productId, warehouseId);
  const { data: lots = [], isLoading: lotsLoading } = useLotsQuery({
    product_id: productId,
    warehouse_id: warehouseId,
    status: "active",
    with_stock: true,
  });
  const { data: suggestionResponse, isLoading: suggestionsLoading } = useAllocationSuggestions({
    product_id: productId,
  });
  const deliveryPlaceApi = useMasterApi<DeliveryPlace>(
    "masters/delivery-places",
    "delivery-places",
  );
  const { data: deliveryPlaces = [] } = deliveryPlaceApi.useList();
  const customerApi = useMasterApi<Customer>("masters/customers", "customers");
  const { data: customers = [] } = customerApi.useList();
  const isLoading = itemLoading || lotsLoading || suggestionsLoading;

  const dateColumns = useMemo(() => {
    const suggestions = suggestionResponse?.suggestions || [];
    const dateSet = new Set<string>();
    suggestions.forEach((s) => {
      if (s.forecast_period) dateSet.add(s.forecast_period);
    });
    return Array.from(dateSet).sort();
  }, [suggestionResponse]);

  const lotBlocks = useMemo(() => {
    if (!inventoryItem) return [];
    const dpMap = new Map(deliveryPlaces.map((dp) => [dp.id, dp]));
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const context = {
      dpMap,
      customerMap,
      suggestions: suggestionResponse?.suggestions || [],
      productCode: inventoryItem.product_code || "-",
    };
    return lots.map((lot) => mapLotBlock(lot, context));
  }, [inventoryItem, lots, suggestionResponse, deliveryPlaces, customers]);

  const data = useMemo<ExcelViewData | null>(() => {
    if (!inventoryItem) return null;
    return {
      header: {
        supplierCode: inventoryItem.supplier_code || "-",
        supplierName: inventoryItem.supplier_name || "-",
        warehouseCode: inventoryItem.warehouse_code || "-",
        warehouseName: inventoryItem.warehouse_name || "-",
        productCode: inventoryItem.product_code || "-",
        productName: inventoryItem.product_name || "-",
        unit: lotBlocks[0]?.lotInfo.unit || "g",
        capacity: "-",
        warrantyPeriod: "-",
      },
      dateColumns,
      lots: lotBlocks,
    };
  }, [inventoryItem, dateColumns, lotBlocks]);

  return { data, isLoading };
}
