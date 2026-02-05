import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";

import { httpAuth, httpPublic } from "@/shared/api/http-client";
import { hasAuthToken } from "@/shared/auth/token";
import { useAuthAwareQuery } from "@/shared/hooks/useAuthenticatedQuery";

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

  const isConflictError = (error: unknown): boolean =>
    error instanceof HTTPError && error.response?.status === 409;

  const handleConflict = (id?: string | number) => {
    toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    if (id !== undefined) {
      queryClient.invalidateQueries({ queryKey: [queryKey, id] });
    }
  };

  // List (with optional include_inactive parameter)
  const useList = (includeInactive = false) =>
    useAuthAwareQuery({
      queryKey: [queryKey, { includeInactive }],
      queryFn: () => {
        const url = includeInactive ? `${resourcePath}?include_inactive=true` : resourcePath;
        const client = hasAuthToken() ? httpAuth : httpPublic;
        return client.get<T[]>(url);
      },
    });

  // Get
  const useGet = (id: string | number) =>
    useAuthAwareQuery({
      queryKey: [queryKey, id],
      queryFn: () => {
        const client = hasAuthToken() ? httpAuth : httpPublic;
        return client.get<T>(`${resourcePath}/${id}`);
      },
      enabled: !!id,
    });

  // Create
  const useCreate = () =>
    useMutation({
      mutationFn: (data: TCreate) => httpAuth.post<T>(resourcePath, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });

  // Update
  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: TUpdate }) =>
        httpAuth.put<T>(`${resourcePath}/${id}`, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error, variables) => {
        if (isConflictError(error)) {
          handleConflict(variables.id);
        }
      },
    });

  // Delete (backward compatible - simple id parameter)
  // Note: For master data with soft delete support, this performs soft delete
  const useDelete = () =>
    useMutation({
      mutationFn: ({ id, version }: { id: string | number; version: number }) =>
        httpAuth.deleteVoid(`${resourcePath}/${id}?version=${version}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error, variables) => {
        if (isConflictError(error)) {
          handleConflict(variables.id);
        }
      },
    });

  // Soft Delete with optional end_date
  const useSoftDelete = () =>
    useMutation({
      mutationFn: ({
        id,
        version,
        endDate,
      }: {
        id: string | number;
        version: number;
        endDate?: string;
      }) => {
        const params = new URLSearchParams();
        if (endDate) {
          params.set("end_date", endDate);
        }
        params.set("version", String(version));
        const url = `${resourcePath}/${id}?${params.toString()}`;
        return httpAuth.deleteVoid(url);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error, variables) => {
        if (isConflictError(error)) {
          handleConflict(variables.id);
        }
      },
    });

  // Permanent Delete (physical delete - admin only)
  const usePermanentDelete = () =>
    useMutation({
      mutationFn: ({ id, version }: { id: string | number; version: number }) =>
        httpAuth.deleteVoid(`${resourcePath}/${id}/permanent?version=${version}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error, variables) => {
        if (isConflictError(error)) {
          handleConflict(variables.id);
        }
      },
    });

  // Restore (restore soft-deleted item)
  const useRestore = () =>
    useMutation({
      mutationFn: (id: string | number) => httpAuth.post<T>(`${resourcePath}/${id}/restore`, {}),
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
