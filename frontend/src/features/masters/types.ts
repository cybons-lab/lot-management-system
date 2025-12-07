/**
 * Master Import Types
 * マスタ一括インポートの型定義
 */

// ============================================================
// Supply Side (仕入系)
// ============================================================

export interface ProductSupplierImportRow {
  maker_part_code: string;
  product_name?: string | null;
  base_unit?: string | null;
  is_primary?: boolean;
  lead_time_days?: number | null;
}

export interface SupplierImportRow {
  supplier_code: string;
  supplier_name: string;
  products?: ProductSupplierImportRow[];
}

export interface SupplyDataImport {
  suppliers?: SupplierImportRow[];
}

// ============================================================
// Customer Side (得意先系)
// ============================================================

export interface DeliveryPlaceImportRow {
  delivery_place_code: string;
  delivery_place_name: string;
  jiku_code?: string | null;
}

export interface CustomerItemImportRow {
  external_product_code: string;
  maker_part_code: string;
  supplier_code?: string | null;
  base_unit?: string | null;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
}

export interface CustomerImportRow {
  customer_code: string;
  customer_name: string;
  delivery_places?: DeliveryPlaceImportRow[];
  items?: CustomerItemImportRow[];
}

export interface CustomerDataImport {
  customers?: CustomerImportRow[];
}

// ============================================================
// Unified Import Request/Response
// ============================================================

export type ImportMode = "upsert" | "replace";

export interface MasterImportRequest {
  supply_data?: SupplyDataImport | null;
  customer_data?: CustomerDataImport | null;
  mode?: ImportMode;
  dry_run?: boolean;
}

export interface ImportResultDetail {
  table_name: string;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

export type ImportStatus = "success" | "partial" | "failed";

export interface MasterImportResponse {
  status: ImportStatus;
  dry_run: boolean;
  results: ImportResultDetail[];
  errors: string[];
}

// ============================================================
// Template Types
// ============================================================

export type TemplateGroup = "supply" | "customer";

export interface MasterImportTemplate {
  supply_data?: SupplyDataImport;
  customer_data?: CustomerDataImport;
}
