import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";

import {
  createAssignment,
  deleteAssignment,
  getSupplierUsers,
  getUserSuppliers,
  updateAssignment,
} from "@/shared/api/assignments";
import type { components } from "@/types/api";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

type UserSupplierAssignmentUpdate = components["schemas"]["UserSupplierAssignmentUpdate"];

export const assignmentKeys = {
  all: ["assignments"] as const,
  user: (userId: number) => [...assignmentKeys.all, "user", userId] as const,
  supplier: (supplierId: number) => [...assignmentKeys.all, "supplier", supplierId] as const,
};

export function useUserAssignments(userId: number) {
  return useQuery({
    queryKey: assignmentKeys.user(userId),
    queryFn: () => getUserSuppliers(userId),
    enabled: !!userId,
  });
}

export function useSupplierAssignments(supplierId: number) {
  return useQuery({
    queryKey: assignmentKeys.supplier(supplierId),
    queryFn: () => getSupplierUsers(supplierId),
    enabled: !!supplierId,
  });
}

export function useAssignmentMutations() {
  const queryClient = useQueryClient();
  const isConflictError = (error: unknown) =>
    error instanceof HTTPError && error.response?.status === 409;

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.user(variables.user_id) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.supplier(variables.supplier_id) });
      queryClient.invalidateQueries({ queryKey: ["user-suppliers"] });
      toast.success("担当割り当てを作成しました");
    },
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`担当割り当ての作成に失敗しました: ${message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserSupplierAssignmentUpdate }) =>
      updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["user-suppliers"] });
      toast.success("担当割り当てを更新しました");
    },
    onError: async (error) => {
      if (isConflictError(error)) {
        toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
        queryClient.invalidateQueries({ queryKey: ["user-suppliers"] });
        return;
      }
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`担当割り当ての更新に失敗しました: ${message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) => deleteAssignment(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["user-suppliers"] });
      toast.success("担当割り当てを削除しました");
    },
    onError: async (error) => {
      if (isConflictError(error)) {
        toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
        queryClient.invalidateQueries({ queryKey: ["user-suppliers"] });
        return;
      }
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`担当割り当ての削除に失敗しました: ${message}`);
    },
  });
  return {
    createAssignment: createMutation.mutateAsync,
    updateAssignment: updateMutation.mutateAsync,
    deleteAssignment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
