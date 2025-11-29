/**
 * Product Mutation Hooks
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ProductCreate, ProductUpdate } from "../api";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpsertProducts,
} from "../api";
import type { ProductBulkRow } from "../types/bulk-operation";

import { productsQueryKey } from "./useProductsQuery";

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductCreate) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      toast.success("商品を登録しました");
    },
    onError: () => toast.error("商品の登録に失敗しました"),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productCode, data }: { productCode: string; data: ProductUpdate }) =>
      updateProduct(productCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      toast.success("商品を更新しました");
    },
    onError: () => toast.error("商品の更新に失敗しました"),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productCode: string) => deleteProduct(productCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      toast.success("商品を削除しました");
    },
    onError: () => toast.error("商品の削除に失敗しました"),
  });
}

export function useBulkUpsertProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: ProductBulkRow[]) => bulkUpsertProducts(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      const { summary } = result;
      if (result.status === "success") {
        toast.success(`${summary.total}件の処理が完了しました`);
      } else if (result.status === "partial") {
        toast.warning(`${summary.total}件中${summary.failed}件が失敗しました`);
      } else {
        toast.error("すべての処理が失敗しました");
      }
    },
    onError: () => toast.error("一括処理に失敗しました"),
  });
}
