/**
 * Product Mappings API (商品マスタ)
 */
import { http } from "@/shared/api/http-client";

export interface ProductMapping {
  id: number;
  customer_id: number;
  customer_part_code: string;
  supplier_id: number;
  product_group_id: number;
  base_unit: string;
  pack_unit: string | null;
  pack_quantity: number | null;
  special_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductMappingCreate {
  customer_id: number;
  customer_part_code: string;
  supplier_id: number;
  product_group_id: number;
  base_unit: string;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
  is_active?: boolean;
}

export interface ProductMappingUpdate {
  customer_id?: number;
  customer_part_code?: string;
  supplier_id?: number;
  product_group_id?: number;
  base_unit?: string;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
  is_active?: boolean;
}

const BASE_PATH = "masters/product-mappings";

export async function fetchProductMappings(params?: {
  customer_id?: number;
  supplier_id?: number;
  product_group_id?: number;
  is_active?: boolean;
}): Promise<ProductMapping[]> {
  const searchParams = new URLSearchParams();
  if (params?.customer_id) searchParams.append("customer_id", String(params.customer_id));
  if (params?.supplier_id) searchParams.append("supplier_id", String(params.supplier_id));
  if (params?.product_group_id)
    searchParams.append("product_group_id", String(params.product_group_id));
  if (params?.is_active !== undefined) searchParams.append("is_active", String(params.is_active));
  const query = searchParams.toString();
  return http.get<ProductMapping[]>(`${BASE_PATH}${query ? `?${query}` : ""}`);
}

export async function fetchProductMapping(id: number): Promise<ProductMapping> {
  return http.get<ProductMapping>(`${BASE_PATH}/${id}`);
}

export async function createProductMapping(data: ProductMappingCreate): Promise<ProductMapping> {
  return http.post<ProductMapping>(BASE_PATH, data);
}

export async function updateProductMapping(
  id: number,
  data: ProductMappingUpdate,
): Promise<ProductMapping> {
  return http.put<ProductMapping>(`${BASE_PATH}/${id}`, data);
}

export async function deleteProductMapping(id: number): Promise<void> {
  return http.deleteVoid(`${BASE_PATH}/${id}`);
}
