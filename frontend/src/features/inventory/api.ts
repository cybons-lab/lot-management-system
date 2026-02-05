import { http } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

// ===== Lots Types (v2) =====

export type LotsGetParams = {
  skip?: number;
  limit?: number;
  supplier_item_id?: number | null;
  product_code?: string | null;
  supplier_code?: string | null;
  warehouse_id?: number | null;
  warehouse_code?: string | null;
  expiry_from?: string | null;
  expiry_to?: string | null;
  with_stock?: boolean;
  status?: string | null;
  prioritize_assigned?: boolean;
};
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

export type GroupByMode = "supplier_product_warehouse" | "product_warehouse";

export interface SuppliersSummary {
  representative_supplier_id: number;
  representative_supplier_code: string;
  representative_supplier_name: string;
  other_count: number;
}

export type InventoryItem =
  paths["/api/v2/inventory/"]["get"]["responses"][200]["content"]["application/json"]["items"][number] & {
    active_lot_count: number;
    inventory_state: InventoryState;
    // Supplier fields (present when group_by='supplier_product_warehouse')
    supplier_id?: number;
    supplier_name?: string;
    supplier_code?: string;
    // Aggregated suppliers (for product_warehouse grouping with multiple suppliers)
    suppliers_summary?: SuppliersSummary;
    is_assigned_supplier?: boolean;
    capacity?: string | null;
    warranty_period_days?: number | null;
  };

export type InventoryListResponse = {
  items: InventoryItem[];
  total: number;
  page: number;
  size: number;
};

export type InventoryItemsListParams = {
  skip?: number;
  limit?: number;
  supplier_item_id?: number | null;
  warehouse_id?: number | null;
  supplier_id?: number | null;
  tab?: string;
  group_by?: string;
  assigned_staff_only?: boolean;
};

export type InventoryBySupplierResponse = {
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  is_assigned_supplier: boolean;
  total_quantity: string;
  lot_count: number;
  product_count: number;
};
export type InventoryByWarehouseResponse = {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  total_quantity: string;
  lot_count: number;
  product_count: number;
};
export type InventoryByProductResponse = {
  supplier_item_id: number;
  product_name: string;
  product_code: string;
  total_quantity: string;
  allocated_quantity: string;
  available_quantity: string;
  lot_count: number;
  warehouse_count: number;
};

export interface FilterOption {
  id: number;
  code: string;
  name: string;
}

export interface FilterOptions {
  products: FilterOption[];
  suppliers: FilterOption[];
  warehouses: FilterOption[];
  effective_tab?: string;
}

// ===== Lots API Functions =====

/**
 * ロット一覧取得 (v2)
 */
export const getLots = (params?: LotsGetParams) => {
  const searchParams = new URLSearchParams();

  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.supplier_item_id != null)
    searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params?.product_code) searchParams.append("product_code", params.product_code);
  if (params?.supplier_code) searchParams.append("supplier_code", params.supplier_code);
  if (params?.warehouse_id != null)
    searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params?.warehouse_code) searchParams.append("warehouse_code", params.warehouse_code);
  if (params?.expiry_from) searchParams.append("expiry_from", params.expiry_from);
  if (params?.expiry_to) searchParams.append("expiry_to", params.expiry_to);
  if (params?.with_stock !== undefined)
    searchParams.append("with_stock", params.with_stock.toString());
  if (params?.status) searchParams.append("status", params.status);
  if (params?.prioritize_assigned !== undefined)
    searchParams.append("prioritize_assigned", params.prioritize_assigned.toString());

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
  const searchParams = new URLSearchParams();
  searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params.warehouse_id) searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params.min_quantity) searchParams.append("min_quantity", params.min_quantity.toString());

  const queryString = searchParams.toString();
  return http.get<AvailableLotResponse[]>(`v2/lot/available?${queryString}`);
};

/**
 * ロット検索 (v2) - Server-Side Pagination & Filtering
 */
export type LotSearchResponse = {
  items: LotResponse[];
  total: number;
  page: number;
  size: number;
};
export type LotSearchParams = {
  q?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";

  supplier_item_id?: number;
  warehouse_id?: number;
  supplier_code?: string;

  expiry_from?: string; // YYYY-MM-DD
  expiry_to?: string;

  status?: string;
  with_stock?: boolean;
};

export const searchLots = (params: LotSearchParams) => {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.append("q", params.q);
  if (params.page !== undefined) searchParams.append("page", params.page.toString());
  if (params.size !== undefined) searchParams.append("size", params.size.toString());
  if (params.sort_by) searchParams.append("sort_by", params.sort_by);
  if (params.sort_order) searchParams.append("sort_order", params.sort_order);

  if (params.supplier_item_id)
    searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params.warehouse_id) searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params.supplier_code) searchParams.append("supplier_code", params.supplier_code);

  if (params.expiry_from) searchParams.append("expiry_from", params.expiry_from);
  if (params.expiry_to) searchParams.append("expiry_to", params.expiry_to);

  if (params.status) searchParams.append("status", params.status);
  if (params.with_stock !== undefined)
    searchParams.append("with_stock", params.with_stock.toString());

  const queryString = searchParams.toString();
  return http.get<LotSearchResponse>(`v2/lot/search?${queryString}`);
};

/**
 * ロットラベルPDFダウンロード (v2)
 */
export const downloadLotLabels = async (lotIds: number[]) => {
  const response = await http.post<Blob>(
    "v2/lot/labels/download",
    { lot_ids: lotIds },
    {
      headers: {
        "Content-Type": "application/json",
      },
      // @ts-expect-error http client might not support responseType directly in types but underlying fetch/axios does
      responseType: "blob",
    },
  );
  return response as unknown as Blob;
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
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.supplier_item_id)
    searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params?.warehouse_id) searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params?.supplier_id) searchParams.append("supplier_id", params.supplier_id.toString());
  if (params?.tab) searchParams.append("tab", params.tab);
  if (params?.group_by) searchParams.append("group_by", params.group_by);
  if (params?.assigned_staff_only)
    searchParams.append("assigned_staff_only", params.assigned_staff_only.toString());

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
  const searchParams = new URLSearchParams();
  if (params?.supplier_item_id)
    searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params?.warehouse_id) searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params?.supplier_id) searchParams.append("supplier_id", params.supplier_id.toString());
  if (params?.tab) searchParams.append("tab", params.tab);
  if (params?.assigned_staff_only)
    searchParams.append("assigned_staff_only", params.assigned_staff_only.toString());
  if (params?.mode) searchParams.append("mode", params.mode);

  const queryString = searchParams.toString();
  return http.get<FilterOptions>(
    `v2/inventory/filter-options${queryString ? "?" + queryString : ""}`,
  );
};

// ===== Phase 10.2: Lot Split =====

export interface LotSplitRequest {
  splits: { quantity: number }[];
}

export interface LotSplitResponse {
  original_lot_id: number;
  new_lot_ids: number[];
  message: string;
}

/**
 * Split a lot receipt into multiple receipts (Phase 10.2)
 * @endpoint POST /api/lots/{lot_id}/split
 */
export const splitLotReceipt = (lotId: number, request: LotSplitRequest) => {
  return http.post<LotSplitResponse>(`lots/${lotId}/split`, request);
};

// ===== Phase 11: Lot Quantity Update with Reason =====

export interface LotQuantityUpdateRequest {
  new_quantity: number;
  reason: string;
}

export interface LotQuantityUpdateResponse {
  lot_receipt_id: number;
  old_quantity: number;
  new_quantity: number;
  adjustment_id: number;
  message: string;
}

/**
 * Update lot receipt quantity with mandatory reason (Phase 11)
 * @endpoint PUT /api/lots/{lot_id}/quantity
 */
export const updateLotQuantityWithReason = (lotId: number, request: LotQuantityUpdateRequest) => {
  return http.put<LotQuantityUpdateResponse>(`lots/${lotId}/quantity`, request);
};

// ===== Phase 10.3: Smart Split with Allocation Transfer =====

export interface AllocationTransfer {
  lot_id: number;
  delivery_place_id: number;
  customer_id: number;
  forecast_period: string;
  quantity: number;
  target_lot_index: number;
  coa_issue_date?: string | null;
  comment?: string | null;
  manual_shipment_date?: string | null;
}

export interface SmartSplitRequest {
  split_count: number;
  allocation_transfers: AllocationTransfer[];
}

export interface SmartSplitResponse {
  original_lot_id: number;
  new_lot_ids: number[];
  split_quantities: number[];
  transferred_allocations: number;
  message: string;
}

/**
 * Smart split lot with allocation transfer (Phase 10.3)
 * @endpoint POST /api/lots/{lot_id}/smart-split
 */
export const smartSplitLot = (lotId: number, request: SmartSplitRequest) => {
  return http.post<SmartSplitResponse>(`lots/${lotId}/smart-split`, request);
};
