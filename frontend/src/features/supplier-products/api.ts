import { http } from "@/shared/api/http-client";

export interface SupplierProduct {
  id: number;
  supplier_id: number;
  maker_part_no: string;
  display_name: string;
  base_unit: string;
  lead_time_days: number | null;
  notes: string | null;
  supplier_code: string;
  supplier_name: string;
  created_at: string;
  updated_at: string;
  valid_to: string;
}

export interface SupplierProductCreate {
  supplier_id: number;
  maker_part_no: string;
  display_name: string;
  base_unit: string;
  lead_time_days?: number | null;
  notes?: string | null;
}

export interface SupplierProductUpdate {
  is_primary?: boolean;
  lead_time_days?: number | null;
  display_name?: string | null; // Phase1: 新規追加
  notes?: string | null; // Phase1: 新規追加
}

const BASE_PATH = "masters/supplier-items";

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

// Alias for convenience
export const getSupplierProducts = fetchSupplierProducts;
