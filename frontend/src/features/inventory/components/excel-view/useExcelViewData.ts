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
import {
  getCustomerItems,
  getCustomerItemById,
  type CustomerItem,
} from "@/features/customer-items/api";
import {
  fetchDeliverySettings,
  type CustomerItemDeliverySetting,
} from "@/features/customer-items/delivery-settings/api";
import { type Customer } from "@/features/customers/api";
import { type DeliveryPlace } from "@/features/delivery-places/api";
import { useInventoryItems } from "@/features/inventory/hooks";
import { useLotsQuery } from "@/hooks/api";
import { useMasterApi } from "@/shared/hooks/useMasterApi";
import { type LotUI } from "@/shared/libs/normalize";

interface MapContext {
  dpMap: Map<number, DeliveryPlace>;
  customerMap: Map<number, Customer>;
  customerPartNoMap: Map<number, string>;
  suggestions: AllocationSuggestionResponse[];
  productCode: string;
  mustShowDpIds: number[];
  globalDpIds: number[];
}

const getShipmentByDate = (
  lotId: number,
  dpId: number,
  suggestions: AllocationSuggestionResponse[],
): {
  shipmentQtyByDate: Record<string, number>;
  coaIssueDateByDate: Record<string, string | null>;
  commentByDate: Record<string, string>;
  manualShipmentDateByDate: Record<string, string>;
  totalShipmentQty: number;
} => {
  const lotDestSuggestions = suggestions.filter(
    (s) => s.lot_id === lotId && s.delivery_place_id === dpId,
  );
  const shipmentQtyByDate: Record<string, number> = {};
  const coaIssueDateByDate: Record<string, string | null> = {};
  const commentByDate: Record<string, string> = {};
  const manualShipmentDateByDate: Record<string, string> = {};
  let totalShipmentQty = 0;
  lotDestSuggestions.forEach((s) => {
    const qty = Number(s.quantity);
    if (s.forecast_period) {
      shipmentQtyByDate[s.forecast_period] = (shipmentQtyByDate[s.forecast_period] || 0) + qty;
      // Note: coa_issue_date is technically per suggestion record.
      // In Excel View, we have one row per (lot, destination) and one column per date.
      coaIssueDateByDate[s.forecast_period] =
        (s as AllocationSuggestionResponse).coa_issue_date ?? null;
      // Phase 9.2: Map comments by date
      if ((s as AllocationSuggestionResponse).comment) {
        commentByDate[s.forecast_period] = (s as AllocationSuggestionResponse).comment || "";
      }
      // Phase 9.3: Map manual shipment dates by date
      if ((s as AllocationSuggestionResponse).manual_shipment_date) {
        manualShipmentDateByDate[s.forecast_period] =
          (s as AllocationSuggestionResponse).manual_shipment_date || "";
      }
    }
    totalShipmentQty += qty;
  });
  return {
    shipmentQtyByDate,
    coaIssueDateByDate,
    commentByDate,
    manualShipmentDateByDate,
    totalShipmentQty,
  };
};

// Multiple || operators increase complexity, but this is a simple data mapping function
// eslint-disable-next-line complexity -- 業務分岐を明示的に維持するため
const getDestinationInfo = (dpId: number, context: MapContext): DestinationInfo => {
  const { dpMap, customerMap, customerPartNoMap, productCode } = context;
  const dp = dpMap.get(dpId);
  const customer = customerMap.get(dp?.customer_id || 0);
  return {
    deliveryPlaceId: dpId,
    deliveryPlaceName: dp?.delivery_place_name || `Unknown (${dpId})`,
    customerName: customer?.customer_name || "-",
    customerCode: customer?.customer_code || "-",
    deliveryPlaceCode: dp?.delivery_place_code || "-",
    customerPartNo: customerPartNoMap.get(dp?.customer_id || 0) || "-",
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
  const {
    shipmentQtyByDate,
    coaIssueDateByDate,
    commentByDate,
    manualShipmentDateByDate,
    totalShipmentQty,
  } = getShipmentByDate(lotId, dpId, suggestions);
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
    // Phase 9.2: Map comments by date
    commentByDate: Object.keys(commentByDate).length > 0 ? commentByDate : undefined,
    // Phase 9.3: Map manual shipment dates by date
    manualShipmentDateByDate:
      Object.keys(manualShipmentDateByDate).length > 0 ? manualShipmentDateByDate : undefined,
  };
};

const getLotInfo = (lot: LotUI): LotInfo => ({
  inboundDate: lot.received_date ? String(lot.received_date).substring(0, 10) : "-",
  lotNo: lot.lot_number || "-",
  inboundNo: lot.origin_reference || "-",
  orderNo: lot.order_no || "",
  expiryDate: lot.expiry_date ? String(lot.expiry_date).substring(0, 10) : "期限なし",
  inboundQty: Number(lot.current_quantity),
  unit: lot.unit || "g",
});

const mapLotBlock = (lot: LotUI, context: MapContext): LotBlockData => {
  const lotId = lot.lot_id;
  const dpIds = context.globalDpIds;
  const destinations = dpIds.map((dpId) => mapDestinationRow(dpId, lotId, context));
  const totalShipment = destinations.reduce((sum, d) => sum + d.totalShipmentQty, 0);
  return {
    lotId,
    lotInfo: getLotInfo(lot),
    lotNumber: lot.lot_number ?? null,
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
    // Phase 9: Remarks field
    remarks: lot.remarks ?? null,
  };
};

interface UseExcelViewDataReturn {
  data: ExcelViewData | null;
  isLoading: boolean;
  supplierId: number | undefined;
  customerItem: CustomerItem | undefined;
}

/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
/* eslint-disable complexity -- 業務分岐を明示的に維持するため */
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
    const items =
      (deliveryPlacesResponse as { items?: DeliveryPlace[] })?.items ||
      (Array.isArray(deliveryPlacesResponse) ? deliveryPlacesResponse : []);
    return items;
  }, [deliveryPlacesResponse]);
  const customerApi = useMasterApi<Customer>("masters/customers", "customers");
  const { data: customers = [] } = customerApi.useList();

  // Fetch all customer items for this product to find registered destinations
  const { data: allCustomerItems = [] } = useQuery({
    queryKey: ["customer-items", { supplier_item_id: productId }],
    queryFn: () => getCustomerItems({ supplier_item_id: productId, limit: 1000 }),
    enabled: isEnabled,
  });

  // Fetch delivery settings for relevant customer items
  const { data: allDeliverySettings = [] as CustomerItemDeliverySetting[] } = useQuery({
    queryKey: [
      "customer-item-delivery-settings",
      "bulk",
      allCustomerItems.map((ci: CustomerItem) => ci.id),
    ],
    queryFn: async () => {
      // If we are filtering by one customer item, just fetch that
      const targetItems = customerItemId
        ? (allCustomerItems as CustomerItem[]).filter(
            (ci: CustomerItem) => ci.id === customerItemId,
          )
        : (allCustomerItems as CustomerItem[]);

      const results = await Promise.all(
        targetItems.map((ci: CustomerItem) => fetchDeliverySettings(ci.id)),
      );
      return results.flat();
    },
    enabled: isEnabled && allCustomerItems.length > 0,
  });

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
    const customerPartNoMap = new Map<number, string>();
    (allCustomerItems as CustomerItem[]).forEach((item) => {
      const existing = customerPartNoMap.get(item.customer_id);
      if (!existing || item.is_primary) {
        customerPartNoMap.set(item.customer_id, item.customer_part_no);
      }
    });
    const mustShowDpIds = Array.from(
      new Set(
        allDeliverySettings
          .map((s: CustomerItemDeliverySetting) => s.delivery_place_id)
          .filter((id): id is number => id !== null),
      ),
    );
    const suggestionDpIds = (suggestionResponse?.suggestions || [])
      .map((s) => s.delivery_place_id)
      .filter((id): id is number => typeof id === "number");
    const globalDpIds = Array.from(new Set([...mustShowDpIds, ...suggestionDpIds]));
    globalDpIds.sort((a, b) => {
      const dpA = dpMap.get(a);
      const dpB = dpMap.get(b);
      const codeA = dpA?.delivery_place_code || "";
      const codeB = dpB?.delivery_place_code || "";
      if (codeA && codeB && codeA !== codeB) {
        return codeA.localeCompare(codeB, "ja");
      }
      const nameA = dpA?.delivery_place_name || "";
      const nameB = dpB?.delivery_place_name || "";
      if (nameA && nameB && nameA !== nameB) {
        return nameA.localeCompare(nameB, "ja");
      }
      return a - b;
    });

    return {
      dpMap,
      customerMap,
      customerPartNoMap,
      suggestions: suggestionResponse?.suggestions || [],
      productCode: inventoryItem?.product_code || "-",
      mustShowDpIds,
      globalDpIds,
    };
  }, [
    deliveryPlaces,
    customers,
    allCustomerItems,
    suggestionResponse,
    inventoryItem,
    allDeliverySettings,
  ]);

  const lotBlocks = useMemo(() => {
    if (!inventoryItem) return [];
    // Filter out TMP lots (temporary lots should not be displayed in Excel View)
    const filteredLots = lots.filter((lot) => !lot.lot_number?.startsWith("TMP-"));
    // Sort lots by received_date ascending (oldest first, newest last)
    const sortedLots = [...filteredLots].sort((a, b) => {
      const dateA = a.received_date ? new Date(a.received_date).getTime() : 0;
      const dateB = b.received_date ? new Date(b.received_date).getTime() : 0;
      return dateA - dateB;
    });
    return sortedLots.map((lot) => mapLotBlock(lot, mapContext));
  }, [inventoryItem, lots, mapContext]);

  const data = useMemo<ExcelViewData | null>(() => {
    if (!inventoryItem) return null;
    const involvedDestinations = mapContext.globalDpIds.map((id: number) =>
      getDestinationInfo(id, mapContext),
    );

    // Phase 9: Get page-level notes from delivery settings
    // Use the first delivery setting as the page-level notes source
    const primaryDeliverySetting = allDeliverySettings.find(
      (s: CustomerItemDeliverySetting) => s.customer_item_id === customerItemId,
    );

    return {
      header: {
        supplierCode: inventoryItem.supplier_code || "-",
        supplierName: inventoryItem.supplier_name || "-",
        warehouseCode: "ALL",
        warehouseName: "全倉庫",
        productCode: inventoryItem.product_code || "-",
        productName: inventoryItem.product_name || "-",
        unit: lotBlocks[0]?.lotInfo.unit || "g",
        capacity: inventoryItem.capacity != null ? String(inventoryItem.capacity) : "-",
        warrantyPeriod:
          inventoryItem.warranty_period_days != null
            ? `${inventoryItem.warranty_period_days}日`
            : "-",
        // Customer item info (when filtering by customer_item)
        customerName: customerItem?.customer_name,
        customerCode: customerItem?.customer_code,
        customerPartNo: customerItem?.customer_part_no,
      },
      involvedDestinations,
      dateColumns,
      lots: lotBlocks,
      // Phase 9: Page-level notes
      pageNotes: primaryDeliverySetting?.notes ?? null,
      deliverySettingId: primaryDeliverySetting?.id ?? null,
      deliverySettingVersion: primaryDeliverySetting?.version ?? null,
    };
  }, [
    inventoryItem,
    dateColumns,
    lotBlocks,
    mapContext,
    customerItem,
    allDeliverySettings,
    customerItemId,
  ]);

  return {
    data,
    isLoading: isEnabled ? isLoading : false,
    supplierId: inventoryItem?.supplier_id,
    customerItem,
  };
}
