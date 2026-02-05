import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";

import { httpAuth, httpPublic } from "@/shared/api/http-client";
import { hasAuthToken } from "@/shared/auth/token";
import { useAuthAwareQuery } from "@/shared/hooks/useAuthenticatedQuery";

/**
 * Generic hook for master data CRUD operations.
 */
export function useMasterApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  resourcePath: string,
  queryKey: string,
) {
  const queryClient = useQueryClient();

  const handleConflict = (id?: string | number) => {
    toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    if (id !== undefined) {
      queryClient.invalidateQueries({ queryKey: [queryKey, id] });
    }
  };

  const useList = (includeInactive = false) =>
    useAuthAwareQuery({
      queryKey: [queryKey, { includeInactive }],
      queryFn: () => {
        const url = includeInactive ? `${resourcePath}?include_inactive=true` : resourcePath;
        const client = hasAuthToken() ? httpAuth : httpPublic;
        return client.get<T[]>(url);
      },
    });

  const useGet = (id: string | number) =>
    useAuthAwareQuery({
      queryKey: [queryKey, id],
      queryFn: () => {
        const client = hasAuthToken() ? httpAuth : httpPublic;
        return client.get<T>(`${resourcePath}/${id}`);
      },
      enabled: !!id,
    });

  const { useCreate, useUpdate, useRestore } = createBasicMutations<T, TCreate, TUpdate>({
    resourcePath,
    queryKey,
    queryClient,
    handleConflict,
  });

  const { useDelete, useSoftDelete, usePermanentDelete } = createDeleteMutations({
    resourcePath,
    queryKey,
    queryClient,
    handleConflict,
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

// Helpers

const isConflictError = (error: unknown): boolean =>
  error instanceof HTTPError && error.response?.status === 409;

function createBasicMutations<T, TCreate, TUpdate>({
  resourcePath,
  queryKey,
  queryClient,
  handleConflict,
}: {
  resourcePath: string;
  queryKey: string;
  queryClient: QueryClient;
  handleConflict: (id?: string | number) => void;
}) {
  const useCreate = () =>
    useMutation({
      mutationFn: (data: TCreate) => httpAuth.post<T>(resourcePath, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
    });

  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: TUpdate }) =>
        httpAuth.put<T>(`${resourcePath}/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
      onError: (error: unknown, variables: { id: string | number; data: TUpdate }) =>
        isConflictError(error) && handleConflict(variables.id),
    });

  const useRestore = () =>
    useMutation({
      mutationFn: (id: string | number) => httpAuth.post<T>(`${resourcePath}/${id}/restore`, {}),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
    });

  return { useCreate, useUpdate, useRestore };
}

function createDeleteMutations({
  resourcePath,
  queryKey,
  queryClient,
  handleConflict,
}: {
  resourcePath: string;
  queryKey: string;
  queryClient: QueryClient;
  handleConflict: (id?: string | number) => void;
}) {
  const useDelete = () =>
    useMutation({
      mutationFn: ({ id, version }: { id: string | number; version: number }) =>
        httpAuth.deleteVoid(`${resourcePath}/${id}?version=${version}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
      onError: (error: unknown, variables: { id: string | number; version: number }) =>
        isConflictError(error) && handleConflict(variables.id),
    });

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
        if (endDate) params.set("end_date", endDate);
        params.set("version", String(version));
        return httpAuth.deleteVoid(`${resourcePath}/${id}?${params.toString()}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
      onError: (
        error: unknown,
        variables: { id: string | number; version: number; endDate?: string },
      ) => isConflictError(error) && handleConflict(variables.id),
    });

  const usePermanentDelete = () =>
    useMutation({
      mutationFn: ({ id, version }: { id: string | number; version: number }) =>
        httpAuth.deleteVoid(`${resourcePath}/${id}/permanent?version=${version}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
      onError: (error: unknown, variables: { id: string | number; version: number }) =>
        isConflictError(error) && handleConflict(variables.id),
    });

  return { useDelete, useSoftDelete, usePermanentDelete };
}
