import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http-client";

/**
 * Generic hook for master data CRUD operations.
 * 
 * @param resourcePath API endpoint path (e.g. "/masters/products")
 * @param queryKey React Query key (e.g. "products")
 * @param idField Field name for ID (default: "id", but some masters use code)
 */
export function useMasterApi<T>(
    resourcePath: string,
    queryKey: string
) {
    const queryClient = useQueryClient();

    // List
    const useList = () => useQuery({
        queryKey: [queryKey],
        queryFn: () => http.get<T[]>(resourcePath),
    });

    // Get
    const useGet = (id: string | number) => useQuery({
        queryKey: [queryKey, id],
        queryFn: () => http.get<T>(`${resourcePath}/${id}`),
        enabled: !!id,
    });

    // Create
    const useCreate = () => useMutation({
        mutationFn: (data: Partial<T>) => http.post<T>(resourcePath, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
    });

    // Update
    const useUpdate = () => useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<T> }) =>
            http.put<T>(`${resourcePath}/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
    });

    // Delete
    const useDelete = () => useMutation({
        mutationFn: (id: string | number) => http.deleteVoid(`${resourcePath}/${id}`),
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
    };
}
