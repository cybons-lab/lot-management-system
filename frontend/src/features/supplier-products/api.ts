/**
 * Supplier Products API Types
 */

/**
 * Supplier product mapping.
 *
 * The current OpenAPI specification does not expose this schema, so we define
 * a lightweight interface that matches the fields used in the UI.
 */
export interface SupplierProduct {
  supplier_code: string;
  supplier_name: string;
  product_code: string;
  product_name: string;
  order_unit?: string | null;
  order_lot_size?: number | null;
}

export type SupplierProductCreate = SupplierProduct;
export type SupplierProductUpdate = Partial<SupplierProduct>;
