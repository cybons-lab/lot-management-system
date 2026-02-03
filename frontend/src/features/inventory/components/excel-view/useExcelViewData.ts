import { useQuery } from "@tanstack/react-query";
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
import { getCustomerItemById, type CustomerItem } from "@/features/customer-items/api";
import { type Customer } from "@/features/customers/api";
import { type DeliveryPlace } from "@/features/delivery-places/api";
import { useInventoryItems } from "@/features/inventory/hooks";
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
): {
  shipmentQtyByDate: Record<string, number>;
  coaIssueDateByDate: Record<string, string | null>;
  totalShipmentQty: number;
} => {
  const lotDestSuggestions = suggestions.filter(
    (s) => s.lot_id === lotId && s.delivery_place_id === dpId,
  );
  const shipmentQtyByDate: Record<string, number> = {};
  const coaIssueDateByDate: Record<string, string | null> = {};
  let totalShipmentQty = 0;
  lotDestSuggestions.forEach((s) => {
    const qty = Number(s.quantity);
    if (s.forecast_period) {
      shipmentQtyByDate[s.forecast_period] = (shipmentQtyByDate[s.forecast_period] || 0) + qty;
      // Note: coa_issue_date is technically per suggestion record.
      // In Excel View, we have one row per (lot, destination) and one column per date.
      coaIssueDateByDate[s.forecast_period] =
        (s as AllocationSuggestionResponse).coa_issue_date ?? null;
    }
    totalShipmentQty += qty;
  });
  return { shipmentQtyByDate, coaIssueDateByDate, totalShipmentQty };
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
  const { shipmentQtyByDate, coaIssueDateByDate, totalShipmentQty } = getShipmentByDate(
    lotId,
    dpId,
    suggestions,
  );
  const dp = dpMap.get(dpId);

  // Use the coa_issue_date from any of the suggestions for this (lot, dp)
  // In the future, we might want this per date column, but the UI currently has one field per row.
  const coaIssueDate = Object.values(coaIssueDateByDate)[0] ?? null;

  return {
    deliveryPlaceId: dpId,
    customerId: dp?.customer_id || 0,
    destination: getDestinationInfo(dpId, context),
    shipmentQtyByDate,
    totalShipmentQty,
    coaIssueDate: coaIssueDate ?? undefined,
  };
};

const getLotInfo = (lot: LotUI): LotInfo => ({
  inboundDate: lot.received_date ? String(lot.received_date).substring(0, 10) : "-",
  lotNo: lot.lot_number || "-",
  inboundNo: lot.origin_reference || "-",
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
    // ステータス判定用フィールドを追加
    status: lot.status,
    inspectionStatus: lot.inspection_status,
    receivedDate: lot.received_date,
    expiryDate: lot.expiry_date,
    // 倉庫情報を追加
    warehouseName: lot.warehouse_name || "不明",
    warehouseCode: lot.warehouse_code || "-",
  };
};

interface UseExcelViewDataReturn {
  data: ExcelViewData | null;
  isLoading: boolean;
  supplierId: number | undefined;
  customerItem: CustomerItem | undefined;
}

/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
export function useExcelViewData(
  productId: number,
  customerItemId?: number,
): UseExcelViewDataReturn {
  const isEnabled = !isNaN(productId);

  // Fetch inventory items for this product across all warehouses
  const { data: inventoryData, isLoading: itemLoading } = useInventoryItems(
    isEnabled
      ? {
          supplier_item_id: productId,
          limit: 100,
        }
      : undefined,
  );

  // Use the first inventory item for header data (all should have same product info)
  const inventoryItem = inventoryData?.items?.[0];

  // Fetch customer item if customerItemId is provided
  const { data: customerItem, isLoading: customerItemLoading } = useQuery({
    queryKey: ["customer-item", customerItemId],
    queryFn: () => getCustomerItemById(customerItemId!),
    enabled: !!customerItemId,
  });

  // Need to ensure useLotsQuery and useAllocationSuggestions are disabled if IDs are NaN
  // But they might not support enabled flag directly. Let's check.
  // Actually useLotsQuery uses useQuery which supports enabled.

  const { data: lots = [], isLoading: lotsLoading } = useLotsQuery(
    isEnabled
      ? {
          supplier_item_id: productId,
          status: "active",
          with_stock: true,
        }
      : undefined,
  );

  const { data: suggestionResponse, isLoading: suggestionsLoading } = useAllocationSuggestions(
    isEnabled && (!customerItemId || !!customerItem)
      ? {
          supplier_item_id: productId,
          customer_id: customerItem?.customer_id,
        }
      : undefined,
  );

  const deliveryPlaceApi = useMasterApi<DeliveryPlace>(
    "masters/delivery-places",
    "delivery-places",
  );
  const { data: deliveryPlacesResponse } = deliveryPlaceApi.useList();
  const deliveryPlaces = useMemo(() => {
    return (deliveryPlacesResponse as { items?: DeliveryPlace[] })?.items || [];
  }, [deliveryPlacesResponse]);
  const customerApi = useMasterApi<Customer>("masters/customers", "customers");
  const { data: customers = [] } = customerApi.useList();
  const isLoading = itemLoading || lotsLoading || suggestionsLoading || customerItemLoading;

  const dateColumns = useMemo(() => {
    const suggestions = suggestionResponse?.suggestions || [];
    const dateSet = new Set<string>();
    suggestions.forEach((s) => {
      if (s.forecast_period) dateSet.add(s.forecast_period);
    });
    return Array.from(dateSet).sort();
  }, [suggestionResponse]);

  const mapContext = useMemo(() => {
    const dpMap = new Map(deliveryPlaces.map((dp) => [dp.id, dp]));
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    return {
      dpMap,
      customerMap,
      suggestions: suggestionResponse?.suggestions || [],
      productCode: inventoryItem?.product_code || "-",
    };
  }, [deliveryPlaces, customers, suggestionResponse, inventoryItem]);

  const lotBlocks = useMemo(() => {
    if (!inventoryItem) return [];
    // Keep temporary lots so users can assign a real lot number from this view.
    // Sort lots by received_date ascending (oldest first, newest last)
    const sortedLots = [...lots].sort((a, b) => {
      const dateA = a.received_date ? new Date(a.received_date).getTime() : 0;
      const dateB = b.received_date ? new Date(b.received_date).getTime() : 0;
      return dateA - dateB;
    });
    return sortedLots.map((lot) => mapLotBlock(lot, mapContext));
  }, [inventoryItem, lots, mapContext]);

  const data = useMemo<ExcelViewData | null>(() => {
    if (!inventoryItem) return null;
    const uniqueDpIds = Array.from(new Set(mapContext.suggestions.map((s) => s.delivery_place_id)));
    const involvedDestinations = uniqueDpIds.map((id) => getDestinationInfo(id, mapContext));

    return {
      header: {
        supplierCode: inventoryItem.supplier_code || "-",
        supplierName: inventoryItem.supplier_name || "-",
        warehouseCode: "ALL",
        warehouseName: "全倉庫",
        productCode: inventoryItem.product_code || "-",
        productName: inventoryItem.product_name || "-",
        unit: lotBlocks[0]?.lotInfo.unit || "g",
        capacity: "-",
        warrantyPeriod: "-",
        // Customer item info (when filtering by customer_item)
        customerName: customerItem?.customer_name,
        customerCode: customerItem?.customer_code,
        customerPartNo: customerItem?.customer_part_no,
      },
      involvedDestinations,
      dateColumns,
      lots: lotBlocks,
    };
  }, [inventoryItem, dateColumns, lotBlocks, mapContext, customerItem]);

  return {
    data,
    isLoading: isEnabled ? isLoading : false,
    supplierId: inventoryItem?.supplier_id,
    customerItem,
  };
}
