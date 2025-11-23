/**
 * Roles Hooks (v2.2 - Phase G-2)
 * TanStack Query hooks for role management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { RolesListParams, CreateRoleRequest, UpdateRoleRequest } from "../api";
import { getRoles, getRole, createRole, updateRole, deleteRole } from "../api";

// ===== Query Keys =====

export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (params?: RolesListParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
};

// ===== Query Hooks =====

/**
 * Get roles list
 */
export const useRoles = (params?: RolesListParams) => {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => getRoles(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get role detail
 */
export const useRole = (roleId: number) => {
  return useQuery({
    queryKey: roleKeys.detail(roleId),
    queryFn: () => getRole(roleId),
    enabled: roleId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create role
 */
export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleRequest) => createRole(data),
    onSuccess: () => {
      // Invalidate roles list to refetch
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
};

/**
 * Update role
 */
export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: number; data: UpdateRoleRequest }) =>
      updateRole(roleId, data),
    onSuccess: (_, variables) => {
      // Invalidate roles list and detail to refetch
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) });
    },
  });
};

/**
 * Delete role
 */
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) => deleteRole(roleId),
    onSuccess: () => {
      // Invalidate roles list to refetch
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
};
