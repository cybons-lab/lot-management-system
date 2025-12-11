/**
 * Product Mappings Hooks (商品マスタ)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProductMapping,
  deleteProductMapping,
  fetchProductMappings,
  updateProductMapping,
  type ProductMappingCreate,
  type ProductMappingUpdate,
} from "../api";

const QUERY_KEY = ["product-mappings"] as const;

export function useProductMappings(params?: {
  customer_id?: number;
  supplier_id?: number;
  product_id?: number;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: params ? [...QUERY_KEY, params] : QUERY_KEY,
    queryFn: () => fetchProductMappings(params),
  });
}

export function useCreateProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductMappingCreate) => createProductMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductMappingUpdate }) =>
      updateProductMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProductMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
