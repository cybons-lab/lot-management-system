import type { paths } from "@/types/api";

// ===== Lots Types (v2) =====

export interface LotsGetParams {
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
}
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

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  size: number;
}

export interface InventoryItemsListParams {
  skip?: number;
  limit?: number;
  supplier_item_id?: number | null;
  warehouse_id?: number | null;
  supplier_id?: number | null;
  tab?: string;
  group_by?: string;
  assigned_staff_only?: boolean;
}

export interface InventoryBySupplierResponse {
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  is_assigned_supplier: boolean;
  total_quantity: string;
  lot_count: number;
  product_count: number;
}
export interface InventoryByWarehouseResponse {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  total_quantity: string;
  lot_count: number;
  product_count: number;
}
export interface InventoryByProductResponse {
  supplier_item_id: number;
  product_name: string;
  product_code: string;
  total_quantity: string;
  allocated_quantity: string;
  available_quantity: string;
  lot_count: number;
  warehouse_count: number;
}

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

/**
 * ロット検索 (v2) - Server-Side Pagination & Filtering
 */
export interface LotSearchResponse {
  items: LotResponse[];
  total: number;
  page: number;
  size: number;
}
export interface LotSearchParams {
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
}

// ===== Phase 10.2: Lot Split =====

export interface LotSplitRequest {
  splits: { quantity: number }[];
}

export interface LotSplitResponse {
  original_lot_id: number;
  new_lot_ids: number[];
  message: string;
}

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
