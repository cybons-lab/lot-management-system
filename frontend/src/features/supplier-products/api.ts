/**
 * Supplier Products API Types
 */

export interface SupplierProductResponse {
  supplier_code: string;
  supplier_name: string;
  product_code: string;
  product_name: string;
  order_unit?: string;
  order_lot_size?: number;
}

export type SupplierProductCreate = Partial<SupplierProductResponse>;
export type SupplierProductUpdate = Partial<SupplierProductResponse>;
