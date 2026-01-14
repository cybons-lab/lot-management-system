import { http } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

// ===== Lots Types (v2) =====

export type LotsGetParams = paths["/api/v2/lot/"]["get"]["parameters"]["query"];
export type LotResponse =
  paths["/api/v2/lot/"]["get"]["responses"][200]["content"]["application/json"][number];
export type LotDetailResponse =
  paths["/api/v2/lot/{lot_id}"]["get"]["responses"][200]["content"]["application/json"];

export type AvailableLotResponse =
  paths["/api/v2/lot/available"]["get"]["responses"][200]["content"]["application/json"][number];

export type LotCreateRequest =
  paths["/api/v2/lot/"]["post"]["requestBody"]["content"]["application/json"];
export type LotCreateResponse =
  paths["/api/v2/lot/"]["post"]["responses"][201]["content"]["application/json"];

// ===== Inventory Items Types (v2) =====

export type InventoryState = "in_stock" | "depleted_only" | "no_lots";

export type InventoryItem =
  paths["/api/v2/inventory/"]["get"]["responses"][200]["content"]["application/json"][number] & {
    active_lot_count: number;
    inventory_state: InventoryState;
  };

export type InventoryItemsListParams = paths["/api/v2/inventory/"]["get"]["parameters"]["query"];

export type InventoryBySupplierResponse =
  paths["/api/v2/inventory/by-supplier"]["get"]["responses"][200]["content"]["application/json"][number];
export type InventoryByWarehouseResponse =
  paths["/api/v2/inventory/by-warehouse"]["get"]["responses"][200]["content"]["application/json"][number];
export type InventoryByProductResponse =
  paths["/api/v2/inventory/by-product"]["get"]["responses"][200]["content"]["application/json"][number];

// ===== Lots API Functions =====

/**
 * ロット一覧取得 (v2)
 */
export const getLots = (params?: LotsGetParams) => {
  const searchParams = new URLSearchParams();

  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.product_id != null) searchParams.append("product_id", params.product_id.toString());
  if (params?.product_code) searchParams.append("product_code", params.product_code);
  if (params?.supplier_code) searchParams.append("supplier_code", params.supplier_code);
  if (params?.warehouse_id != null)
    searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params?.warehouse_code) searchParams.append("warehouse_code", params.warehouse_code);
  if (params?.expiry_from) searchParams.append("expiry_from", params.expiry_from);
  if (params?.expiry_to) searchParams.append("expiry_to", params.expiry_to);
  if (params?.with_stock !== undefined)
    searchParams.append("with_stock", params.with_stock.toString());
  if (params?.prioritize_primary !== undefined)
    searchParams.append("prioritize_primary", params.prioritize_primary.toString());

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
  product_id: number;
  warehouse_id?: number;
  min_quantity?: number;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("product_id", params.product_id.toString());
  if (params.warehouse_id) searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params.min_quantity) searchParams.append("min_quantity", params.min_quantity.toString());

  const queryString = searchParams.toString();
  return http.get<AvailableLotResponse[]>(`v2/lot/available?${queryString}`);
};

// ===== Inventory Items API Functions =====

/**
 * Get inventory items list (v2)
 * @endpoint GET /api/v2/inventory/
 */
export const getInventoryItems = (params?: InventoryItemsListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.product_id) searchParams.append("product_id", params.product_id.toString());
  if (params?.warehouse_id) searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params?.supplier_id) searchParams.append("supplier_id", params.supplier_id.toString());

  const queryString = searchParams.toString();
  return http.get<InventoryItem[]>(`v2/inventory/${queryString ? "?" + queryString : ""}`);
};

/**
 * Get inventory item detail (product + warehouse)
 * @endpoint GET /api/v2/inventory/{product_id}/{warehouse_id}
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
