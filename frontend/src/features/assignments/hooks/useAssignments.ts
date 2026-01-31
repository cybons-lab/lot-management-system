import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createAssignment,
  deleteAssignment,
  getSupplierUsers,
  getUserSuppliers,
  setPrimaryUser,
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

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.user(variables.user_id) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.supplier(variables.supplier_id) });
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
      toast.success("担当割り当てを更新しました");
    },
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`担当割り当ての更新に失敗しました: ${message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      toast.success("担当割り当てを削除しました");
    },
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`担当割り当ての削除に失敗しました: ${message}`);
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: ({ supplierId, userId }: { supplierId: number; userId: number }) =>
      setPrimaryUser(supplierId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.supplier(variables.supplierId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.user(variables.userId) });
      toast.success("主担当者を設定しました");
    },
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`主担当者の設定に失敗しました: ${message}`);
    },
  });

  return {
    createAssignment: createMutation.mutateAsync,
    updateAssignment: updateMutation.mutateAsync,
    deleteAssignment: deleteMutation.mutateAsync,
    setPrimaryUser: setPrimaryMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSettingPrimary: setPrimaryMutation.isPending, // Keep for now but deprecate usage
  };
}
