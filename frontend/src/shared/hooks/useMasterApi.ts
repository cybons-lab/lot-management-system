import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { http } from "@/shared/api/http-client";

/**
 * Generic hook for master data CRUD operations.
 *
 * @param resourcePath API endpoint path (e.g. "masters/products")
 * @param queryKey React Query key (e.g. "products")
 *
 * Supports:
 * - useList(includeInactive) - List with optional inactive items
 * - useGet(id) - Get by ID/code
 * - useCreate() - Create new item
 * - useUpdate() - Update existing item
 * - useDelete() - Delete (soft delete for master data)
 * - useSoftDelete() - Soft delete with optional end_date parameter
 * - usePermanentDelete() - Physical delete (admin only)
 * - useRestore() - Restore soft-deleted item
 */
export function useMasterApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  resourcePath: string,
  queryKey: string,
) {
  const queryClient = useQueryClient();

  // List (with optional include_inactive parameter)
  const useList = (includeInactive = false) =>
    useQuery({
      queryKey: [queryKey, { includeInactive }],
      queryFn: () => {
        const url = includeInactive ? `${resourcePath}?include_inactive=true` : resourcePath;
        return http.get<T[]>(url);
      },
    });

  // Get
  const useGet = (id: string | number) =>
    useQuery({
      queryKey: [queryKey, id],
      queryFn: () => http.get<T>(`${resourcePath}/${id}`),
      enabled: !!id,
    });

  // Create
  const useCreate = () =>
    useMutation({
      mutationFn: (data: TCreate) => http.post<T>(resourcePath, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  // Update
  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: TUpdate }) =>
        http.put<T>(`${resourcePath}/${id}`, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  // Delete (backward compatible - simple id parameter)
  // Note: For master data with soft delete support, this performs soft delete
  const useDelete = () =>
    useMutation({
      mutationFn: (id: string | number) => http.deleteVoid(`${resourcePath}/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  // Soft Delete with optional end_date
  const useSoftDelete = () =>
    useMutation({
      mutationFn: ({ id, endDate }: { id: string | number; endDate?: string }) => {
        const url = endDate ? `${resourcePath}/${id}?end_date=${endDate}` : `${resourcePath}/${id}`;
        return http.deleteVoid(url);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  // Permanent Delete (physical delete - admin only)
  const usePermanentDelete = () =>
    useMutation({
      mutationFn: (id: string | number) => http.deleteVoid(`${resourcePath}/${id}/permanent`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  // Restore (restore soft-deleted item)
  const useRestore = () =>
    useMutation({
      mutationFn: (id: string | number) => http.post<T>(`${resourcePath}/${id}/restore`, {}),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  return {
    useList,
    useGet,
    useCreate,
    useUpdate,
    useDelete,
    useSoftDelete,
    usePermanentDelete,
    useRestore,
  };
}
