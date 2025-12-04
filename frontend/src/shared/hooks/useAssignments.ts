// User-Supplier Assignment hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as assignmentsApi from "../api/assignments";

import type { components } from "@/types/api";

type UserSupplierAssignmentCreate = components["schemas"]["UserSupplierAssignmentCreate"];
type UserSupplierAssignmentUpdate = components["schemas"]["UserSupplierAssignmentUpdate"];
type UserSupplierAssignmentResponse = components["schemas"]["UserSupplierAssignmentResponse"];

/**
 * ユーザーの担当仕入先一覧を取得するフック
 */
export function useUserSuppliers(userId: number) {
  return useQuery<UserSupplierAssignmentResponse[], Error>({
    queryKey: ["assignments", "user", userId],
    queryFn: () => assignmentsApi.getUserSuppliers(userId),
    enabled: !!userId,
  });
}

/**
 * 仕入先の担当者一覧を取得するフック
 */
export function useSupplierUsers(supplierId: number) {
  return useQuery<UserSupplierAssignmentResponse[], Error>({
    queryKey: ["assignments", "supplier", supplierId],
    queryFn: () => assignmentsApi.getSupplierUsers(supplierId),
    enabled: !!supplierId,
  });
}

/**
 * 担当割り当てを作成するフック
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation<UserSupplierAssignmentResponse, Error, UserSupplierAssignmentCreate>({
    mutationFn: assignmentsApi.createAssignment,
    onSuccess: (data) => {
      // ユーザーと仕入先のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["assignments", "user", data.user_id] });
      queryClient.invalidateQueries({ queryKey: ["assignments", "supplier", data.supplier_id] });
    },
  });
}

/**
 * 担当割り当てを更新するフック
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation<
    UserSupplierAssignmentResponse,
    Error,
    { assignmentId: number; data: UserSupplierAssignmentUpdate }
  >({
    mutationFn: ({ assignmentId, data }) => assignmentsApi.updateAssignment(assignmentId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assignments", "user", data.user_id] });
      queryClient.invalidateQueries({ queryKey: ["assignments", "supplier", data.supplier_id] });
    },
  });
}

/**
 * 担当割り当てを削除するフック
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: assignmentsApi.deleteAssignment,
    onSuccess: () => {
      // 全ての担当割り当てキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

/**
 * 仕入先の主担当者を設定するフック
 */
export function useSetPrimaryUser() {
  const queryClient = useQueryClient();

  return useMutation<UserSupplierAssignmentResponse, Error, { supplierId: number; userId: number }>(
    {
      mutationFn: ({ supplierId, userId }) => assignmentsApi.setPrimaryUser(supplierId, userId),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["assignments", "user", data.user_id] });
        queryClient.invalidateQueries({ queryKey: ["assignments", "supplier", data.supplier_id] });
      },
    },
  );
}
