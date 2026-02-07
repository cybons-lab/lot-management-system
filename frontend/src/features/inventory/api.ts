import type {
  LotsGetParams,
  LotResponse,
  LotDetailResponse,
  AvailableLotResponse,
  LotCreateRequest,
  LotCreateResponse,
  InventoryListResponse,
  InventoryItemsListParams,
  InventoryItem,
  InventoryBySupplierResponse,
  InventoryByWarehouseResponse,
  InventoryByProductResponse,
  FilterOptions,
  LotSearchParams,
  LotSearchResponse,
  LotSplitRequest,
  LotSplitResponse,
  LotQuantityUpdateRequest,
  LotQuantityUpdateResponse,
  SmartSplitRequest,
  SmartSplitResponse,
} from "./types";

import { apiClientAuth, http } from "@/shared/api/http-client";

export * from "./types";

/**
 * URLSearchParams を構築するヘルパー関数
 */
const buildSearchParams = (params: Record<string, any> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });
  return searchParams;
};

// ===== Lots API Functions =====

/**
 * ロット一覧取得 (v2)
 */
export const getLots = (params?: LotsGetParams) => {
  const searchParams = buildSearchParams(params ?? {});
  const queryString = searchParams.toString();
  return http.get<LotResponse[]>(`v2/lot/${queryString ? "?" + queryString : ""}`);
};

/**
 * ロット詳細取得 (v2)
 */
export const getLot = (id: number) => http.get<LotDetailResponse>(`v2/lot/${id}`);

/**
 * ロット新規作成 (v2)
 */
export const createLot = (data: LotCreateRequest) => http.post<LotCreateResponse>("v2/lot/", data);

/**
 * 利用可能ロット一覧取得 (v2)
 */
export const getAvailableLots = (params: {
  supplier_item_id: number;
  warehouse_id?: number;
  min_quantity?: number;
}) => {
  const searchParams = buildSearchParams(params);
  const queryString = searchParams.toString();
  return http.get<AvailableLotResponse[]>(`v2/lot/available?${queryString}`);
};

/**
 * ロット検索 (v2) - Server-Side Pagination & Filtering
 */
export const searchLots = (params: LotSearchParams) => {
  const searchParams = buildSearchParams(params);
  const queryString = searchParams.toString();
  return http.get<LotSearchResponse>(`v2/lot/search?${queryString}`);
};

/**
 * ロットラベルPDFダウンロード (v2)
 */
export const downloadLotLabels = async (lotIds: number[]) => {
  const response = await apiClientAuth.post("v2/lot/labels/download", {
    json: { lot_ids: lotIds },
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.blob();
};

// ===== Inventory Items API Functions =====

/**
 * Get inventory items list (v2)
 * @endpoint GET /api/v2/inventory/
 */
export const getInventoryItems = (
  params?: InventoryItemsListParams & {
    tab?: string;
    assigned_staff_only?: boolean;
    group_by?: string;
  },
) => {
  const searchParams = buildSearchParams(params ?? {});
  const queryString = searchParams.toString();
  return http.get<InventoryListResponse>(`v2/inventory/${queryString ? "?" + queryString : ""}`);
};

/**
 * Get inventory item detail (product + warehouse)
 * @endpoint GET /api/v2/inventory/{supplier_item_id}/{warehouse_id}
 */
export const getInventoryItem = (productId: number, warehouseId: number) => {
  return http.get<InventoryItem>(`v2/inventory/${productId}/${warehouseId}`);
};

/**
 * Get inventory aggregated by supplier
 * @endpoint GET /api/v2/inventory/by-supplier
 */
export const getInventoryBySupplier = () => {
  return http.get<InventoryBySupplierResponse[]>("v2/inventory/by-supplier");
};

/**
 * Get inventory aggregated by warehouse
 * @endpoint GET /api/v2/inventory/by-warehouse
 */
export const getInventoryByWarehouse = () => {
  return http.get<InventoryByWarehouseResponse[]>("v2/inventory/by-warehouse");
};

/**
 * Get inventory aggregated by product
 * @endpoint GET /api/v2/inventory/by-product
 */
export const getInventoryByProduct = () => {
  return http.get<InventoryByProductResponse[]>("v2/inventory/by-product");
};

/**
 * Get filter options (products, suppliers, warehouses) based on current selection
 * @endpoint GET /api/v2/inventory/filter-options
 */
export const getFilterOptions = (params?: {
  supplier_item_id?: number;
  warehouse_id?: number;
  supplier_id?: number;
  tab?: string;
  assigned_staff_only?: boolean;
  mode?: "stock" | "master";
}) => {
  const searchParams = buildSearchParams(params ?? {});
  const queryString = searchParams.toString();
  return http.get<FilterOptions>(
    `v2/inventory/filter-options${queryString ? "?" + queryString : ""}`,
  );
};

// ===== Phase 10.2: Lot Split =====

/**
 * Split a lot receipt into multiple receipts (Phase 10.2)
 * @endpoint POST /api/lots/{lot_id}/split
 */
export const splitLotReceipt = (lotId: number, request: LotSplitRequest) => {
  return http.post<LotSplitResponse>(`lots/${lotId}/split`, request);
};

// ===== Phase 11: Lot Quantity Update with Reason =====

/**
 * Update lot receipt quantity with mandatory reason (Phase 11)
 * @endpoint PUT /api/lots/{lot_id}/quantity
 */
export const updateLotQuantityWithReason = (lotId: number, request: LotQuantityUpdateRequest) => {
  return http.put<LotQuantityUpdateResponse>(`lots/${lotId}/quantity`, request);
};

// ===== Phase 10.3: Smart Split with Allocation Transfer =====

/**
 * Smart split lot with allocation transfer (Phase 10.3)
 * @endpoint POST /api/lots/{lot_id}/smart-split
 */
export const smartSplitLot = (lotId: number, request: SmartSplitRequest) => {
  return http.post<SmartSplitResponse>(`lots/${lotId}/smart-split`, request);
};
