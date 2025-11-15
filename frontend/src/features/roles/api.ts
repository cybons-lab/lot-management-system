/**
 * Roles API Client (v2.2 - Phase G-2)
 * ロール管理
 */

import { fetchApi } from "@/shared/libs/http";

// ===== Types =====

/**
 * Role
 */
export interface Role {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request types
 */
export interface CreateRoleRequest {
  role_code: string;
  role_name: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  role_name?: string;
  description?: string | null;
}

export interface RolesListParams {
  skip?: number;
  limit?: number;
}

// ===== API Functions =====

/**
 * Get roles list
 * @endpoint GET /roles
 */
export const getRoles = (params?: RolesListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  return fetchApi.get<Role[]>(`/roles${queryString ? "?" + queryString : ""}`);
};

/**
 * Get role detail
 * @endpoint GET /roles/{role_id}
 */
export const getRole = (roleId: number) => {
  return fetchApi.get<Role>(`/roles/${roleId}`);
};

/**
 * Create role
 * @endpoint POST /roles
 */
export const createRole = (data: CreateRoleRequest) => {
  return fetchApi.post<Role>("/roles", data);
};

/**
 * Update role
 * @endpoint PUT /roles/{role_id}
 */
export const updateRole = (roleId: number, data: UpdateRoleRequest) => {
  return fetchApi.put<Role>(`/roles/${roleId}`, data);
};

/**
 * Delete role
 * @endpoint DELETE /roles/{role_id}
 */
export const deleteRole = (roleId: number) => {
  return fetchApi.delete(`/roles/${roleId}`);
};
