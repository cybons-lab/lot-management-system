/**
 * useDeliverySettings Hook
 * 得意先品番-納入先別設定のカスタムフック
 *
 * Updated: customer_item_id ベースに移行
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CreateDeliverySettingRequest,
  CustomerItemDeliverySetting,
  UpdateDeliverySettingRequest,
} from "./api";
import {
  createDeliverySetting,
  deleteDeliverySetting,
  fetchDeliverySettings,
  updateDeliverySetting,
} from "./api";

const QUERY_KEY = "customer-item-delivery-settings";

export function useDeliverySettings(customerItemId: number) {
  const queryClient = useQueryClient();
  const queryKey = [QUERY_KEY, customerItemId];

  const {
    data: settings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchDeliverySettings(customerItemId),
    enabled: Boolean(customerItemId),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDeliverySettingRequest) => createDeliverySetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("納入先別設定を作成しました");
    },
    onError: () => {
      toast.error("納入先別設定の作成に失敗しました");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDeliverySettingRequest }) =>
      updateDeliverySetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("納入先別設定を更新しました");
    },
    onError: () => {
      toast.error("納入先別設定の更新に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDeliverySetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("納入先別設定を削除しました");
    },
    onError: () => {
      toast.error("納入先別設定の削除に失敗しました");
    },
  });

  return {
    settings,
    isLoading,
    isError,
    error,
    refetch,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export type {
  CustomerItemDeliverySetting,
  CreateDeliverySettingRequest,
  UpdateDeliverySettingRequest,
};
