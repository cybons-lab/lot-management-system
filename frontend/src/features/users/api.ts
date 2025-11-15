/**
 * Users API Client (v2.2 - Phase G-2)
 * ユーザー管理
 */

import { fetchApi } from "@/shared/libs/http";

// ===== Types =====

/**
 * User
 */
export interface User {
  user_id: number;
  username: string;
  email: string;
  display_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User with roles
 */
export interface UserWithRoles extends User {
  role_codes: string[];
}

/**
 * Request types
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  display_name: string;
  password: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  display_name?: string;
  is_active?: boolean;
  password?: string;
}

export interface UserRoleAssignment {
  role_ids: number[];
}

export interface UsersListParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}

// ===== API Functions =====

/**
 * Get users list
 * @endpoint GET /users
 */
export const getUsers = (params?: UsersListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.is_active !== undefined)
    searchParams.append("is_active", params.is_active.toString());

  const queryString = searchParams.toString();
  return fetchApi.get<User[]>(`/users${queryString ? "?" + queryString : ""}`);
};

/**
 * Get user detail with roles
 * @endpoint GET /users/{user_id}
 */
export const getUser = (userId: number) => {
  return fetchApi.get<UserWithRoles>(`/users/${userId}`);
};

/**
 * Create user
 * @endpoint POST /users
 */
export const createUser = (data: CreateUserRequest) => {
  return fetchApi.post<User>("/users", data);
};

/**
 * Update user
 * @endpoint PUT /users/{user_id}
 */
export const updateUser = (userId: number, data: UpdateUserRequest) => {
  return fetchApi.put<User>(`/users/${userId}`, data);
};

/**
 * Delete user
 * @endpoint DELETE /users/{user_id}
 */
export const deleteUser = (userId: number) => {
  return fetchApi.delete(`/users/${userId}`);
};

/**
 * Assign roles to user
 * @endpoint PATCH /users/{user_id}/roles
 */
export const assignUserRoles = (userId: number, data: UserRoleAssignment) => {
  return fetchApi.patch<UserWithRoles>(`/users/${userId}/roles`, data);
};
