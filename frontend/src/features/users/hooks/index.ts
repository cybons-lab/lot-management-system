/**
 * Users Hooks (v2.2 - Phase G-2)
 * TanStack Query hooks for user management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UsersListParams,
  CreateUserRequest,
  UpdateUserRequest,
  UserRoleAssignment,
} from "../api";
import { getUsers, getUser, createUser, updateUser, deleteUser, assignUserRoles } from "../api";

// ===== Query Keys =====

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params?: UsersListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// ===== Query Hooks =====

/**
 * Get users list
 */
export const useUsers = (params?: UsersListParams) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get user detail with roles
 */
export const useUser = (userId: number) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUser(userId),
    enabled: userId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Update user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateUserRequest }) =>
      updateUser(userId, data),
    onSuccess: (_, variables) => {
      // Invalidate users list and detail to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
};

/**
 * Delete user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Assign roles to user
 */
export const useAssignUserRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UserRoleAssignment }) =>
      assignUserRoles(userId, data),
    onSuccess: (_, variables) => {
      // Invalidate user detail to refetch with updated roles
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};
