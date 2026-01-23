import { httpClient } from "@/shared/api/http-client";

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
  return httpClient.get("integration/sap/connections", {
    searchParams: { active_only: activeOnly },
  }).json();
}

export async function createConnection(data: SapConnectionCreateRequest): Promise<SapConnection> {
  return httpClient.post("integration/sap/connections", { json: data }).json();
}

export async function updateConnection(
  id: number,
  data: SapConnectionUpdateRequest
): Promise<SapConnection> {
  return httpClient.put(`integration/sap/connections/${id}`, { json: data }).json();
}

export async function deleteConnection(id: number): Promise<{ status: string; message: string }> {
  return httpClient.delete(`integration/sap/connections/${id}`).json();
}

export async function testConnection(id: number): Promise<SapConnectionTestResponse> {
  return httpClient.post(`integration/sap/connections/${id}/test`).json();
}

export async function fetchMaterials(
  data: SapMaterialFetchRequest
): Promise<SapMaterialFetchResponse> {
  return httpClient.post("integration/sap/materials/fetch", { json: data }).json();
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

  return httpClient.get("integration/sap/materials/cache", { searchParams }).json();
}

export async function clearCache(params: {
  connection_id?: number | null;
  kunnr?: string | null;
}): Promise<{ status: string; deleted_count: number }> {
  const searchParams: Record<string, string | number> = {};
  if (params.connection_id != null) searchParams.connection_id = params.connection_id;
  if (params.kunnr) searchParams.kunnr = params.kunnr;

  return httpClient.delete("integration/sap/materials/cache", { searchParams }).json();
}

export async function listFetchLogs(params: {
  connection_id?: number | null;
  limit?: number;
}): Promise<SapFetchLog[]> {
  const searchParams: Record<string, string | number> = {};
  if (params.connection_id != null) searchParams.connection_id = params.connection_id;
  if (params.limit) searchParams.limit = params.limit;

  return httpClient.get("integration/sap/logs", { searchParams }).json();
}
