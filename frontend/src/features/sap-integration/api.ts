import { http } from "@/shared/api/http-client";

// Types
export interface SapConnection {
  id: number;
  name: string;
  environment: string;
  description: string | null;
  ashost: string;
  sysnr: string;
  client: string;
  user_name: string;
  lang: string;
  default_bukrs: string;
  default_kunnr: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SapConnectionCreateRequest {
  name: string;
  environment: string;
  description?: string | null;
  ashost: string;
  sysnr: string;
  client: string;
  user_name: string;
  passwd: string;
  lang?: string;
  default_bukrs?: string;
  default_kunnr?: string | null;
  is_default?: boolean;
}

export interface SapConnectionUpdateRequest {
  name?: string;
  environment?: string;
  description?: string | null;
  ashost?: string;
  sysnr?: string;
  client?: string;
  user_name?: string;
  passwd?: string;
  lang?: string;
  default_bukrs?: string;
  default_kunnr?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export interface SapConnectionTestResponse {
  success: boolean;
  message: string;
  details: Record<string, unknown> | null;
  duration_ms: number;
}

export interface SapMaterialFetchRequest {
  connection_id?: number | null;
  kunnr_f?: string | null;
  kunnr_t?: string | null;
  bukrs?: string;
  zaiko?: string;
  limit?: number | null;
}

export interface SapMaterialFetchResponse {
  success: boolean;
  fetch_batch_id: string;
  record_count: number;
  cached_count: number;
  error_message: string | null;
  duration_ms: number;
}

export interface SapMaterialCache {
  id: number;
  connection_id: number;
  zkdmat_b: string;
  kunnr: string;
  raw_data: Record<string, unknown>;
  fetched_at: string;
  fetch_batch_id: string | null;
}

export interface SapCacheItem {
  connection_id: number;
  zkdmat_b: string;
  kunnr: string;
  zmkmat_b: string | null;
  meins: string | null;
  zlifnr_h: string | null;
  zotwarh_h: string | null;
  zdepnm_s_h: string | null;
  zshipte_h: string | null;
  fetched_at: string;
  fetch_batch_id: string | null;
  raw_data: Record<string, unknown> | null;
}

export interface SapCacheListResponse {
  items: SapCacheItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SapFetchLog {
  id: number;
  connection_id: number;
  fetch_batch_id: string;
  rfc_name: string;
  params: Record<string, unknown>;
  status: string;
  record_count: number | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// API functions

export async function listConnections(activeOnly = true): Promise<SapConnection[]> {
  return http.get("integration/sap/connections", {
    searchParams: { active_only: activeOnly },
  });
}

export async function createConnection(data: SapConnectionCreateRequest): Promise<SapConnection> {
  return http.post("integration/sap/connections", data);
}

export async function updateConnection(
  id: number,
  data: SapConnectionUpdateRequest,
): Promise<SapConnection> {
  return http.put(`integration/sap/connections/${id}`, data);
}

export async function deleteConnection(id: number): Promise<{ status: string; message: string }> {
  return http.delete(`integration/sap/connections/${id}`);
}

export async function testConnection(id: number): Promise<SapConnectionTestResponse> {
  return http.post(`integration/sap/connections/${id}/test`);
}

export async function fetchMaterials(
  data: SapMaterialFetchRequest,
): Promise<SapMaterialFetchResponse> {
  return http.post("integration/sap/materials/fetch", data);
}

export async function listCachedMaterials(params: {
  connection_id?: number | null;
  kunnr?: string | null;
  limit?: number;
}): Promise<SapMaterialCache[]> {
  const searchParams: Record<string, string | number> = {};
  if (params.connection_id != null) searchParams.connection_id = params.connection_id;
  if (params.kunnr) searchParams.kunnr = params.kunnr;
  if (params.limit) searchParams.limit = params.limit;

  return http.get("integration/sap/materials/cache", { searchParams });
}

export async function clearCache(params: {
  connection_id?: number | null;
  kunnr?: string | null;
}): Promise<{ status: string; deleted_count: number }> {
  const searchParams: Record<string, string | number> = {};
  if (params.connection_id != null) searchParams.connection_id = params.connection_id;
  if (params.kunnr) searchParams.kunnr = params.kunnr;

  return http.delete("integration/sap/materials/cache", { searchParams });
}

export async function getSapCache(params: {
  connection_id?: number | null;
  kunnr?: string | null;
  zkdmat_b_search?: string | null;
  page?: number;
  page_size?: number;
}): Promise<SapCacheListResponse> {
  const searchParams: Record<string, string | number> = {};
  if (params.connection_id != null) searchParams.connection_id = params.connection_id;
  if (params.kunnr) searchParams.kunnr = params.kunnr;
  if (params.zkdmat_b_search) searchParams.zkdmat_b_search = params.zkdmat_b_search;
  if (params.page) searchParams.page = params.page;
  if (params.page_size) searchParams.page_size = params.page_size;

  return http.get("integration/sap/cache", { searchParams });
}

export async function listFetchLogs(params: {
  connection_id?: number | null;
  limit?: number;
}): Promise<SapFetchLog[]> {
  const searchParams: Record<string, string | number> = {};
  if (params.connection_id != null) searchParams.connection_id = params.connection_id;
  if (params.limit) searchParams.limit = params.limit;

  return http.get("integration/sap/logs", { searchParams });
}
