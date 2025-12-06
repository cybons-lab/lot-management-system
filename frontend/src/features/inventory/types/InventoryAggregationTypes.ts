export interface InventoryBySupplierResponse {
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  total_quantity: number;
  lot_count: number;
  product_count: number;
  is_primary_supplier?: boolean;
}

export interface InventoryByWarehouseResponse {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  total_quantity: number;
  lot_count: number;
  product_count: number;
}

export interface InventoryByProductResponse {
  product_id: number;
  product_name: string;
  product_code: string;
  total_quantity: number;
  allocated_quantity: number;
  available_quantity: number;
  lot_count: number;
  warehouse_count: number;
}
