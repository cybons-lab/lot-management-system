import { http } from "@/shared/api/http-client";

export interface SupplierProduct {
  id: number;
  product_id: number;
  supplier_id: number;
  is_primary: boolean;
  lead_time_days: number | null;
  product_code: string;
  product_name: string;
  supplier_code: string;
  supplier_name: string;
  created_at: string;
  updated_at: string;
  // UI helper fields (optional)
  order_unit?: string;
  order_lot_size?: number;
}

export interface SupplierProductCreate {
  product_id: number;
  supplier_id: number;
  is_primary?: boolean;
  lead_time_days?: number | null;
}

export interface SupplierProductUpdate {
  is_primary?: boolean;
  lead_time_days?: number | null;
}

const BASE_PATH = "masters/supplier-products";

export async function fetchSupplierProducts(params?: {
  supplier_id?: number;
}): Promise<SupplierProduct[]> {
  const searchParams = new URLSearchParams();
  if (params?.supplier_id) searchParams.append("supplier_id", String(params.supplier_id));
  const query = searchParams.toString();
  return http.get<SupplierProduct[]>(`${BASE_PATH}${query ? `?${query}` : ""}`);
}

export async function createSupplierProduct(data: SupplierProductCreate): Promise<SupplierProduct> {
  return http.post<SupplierProduct>(BASE_PATH, data);
}

export async function updateSupplierProduct(
  id: number,
  data: SupplierProductUpdate,
): Promise<SupplierProduct> {
  return http.put<SupplierProduct>(`${BASE_PATH}/${id}`, data);
}

export async function deleteSupplierProduct(id: number): Promise<void> {
  return http.deleteVoid(`${BASE_PATH}/${id}`);
}
