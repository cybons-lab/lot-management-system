import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { makersApi, type MakerCreateRequest, type MakerUpdateRequest } from "../api";

export const makerKeys = {
  all: ["makers"] as const,
  lists: () => [...makerKeys.all, "list"] as const,
  list: (params?: { limit?: number; offset?: number }) =>
    [...makerKeys.lists(), { params }] as const,
  details: () => [...makerKeys.all, "detail"] as const,
  detail: (id: number) => [...makerKeys.details(), id] as const,
};

export const useMakers = (params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: makerKeys.list(params),
    queryFn: () => makersApi.getMakers(params),
  });
};

export const useMaker = (id: number) => {
  return useQuery({
    queryKey: makerKeys.detail(id),
    queryFn: () => makersApi.getMaker(id),
    enabled: !!id,
  });
};

export const useCreateMaker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MakerCreateRequest) => makersApi.createMaker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: makerKeys.lists() });
      toast.success("メーカーを作成しました");
    },
    onError: (error: Error) => {
      const message = error.message || "メーカーの作成に失敗しました";
      toast.error(message);
    },
  });
};

export const useUpdateMaker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MakerUpdateRequest }) =>
      makersApi.updateMaker(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: makerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: makerKeys.detail(data.id) });
      toast.success("メーカーを更新しました");
    },
    onError: (error: Error) => {
      const message = error.message || "メーカーの更新に失敗しました";
      toast.error(message);
    },
  });
};

export const useDeleteMaker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => makersApi.deleteMaker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: makerKeys.lists() });
      toast.success("メーカーを削除しました");
    },
    onError: (error: Error) => {
      const message = error.message || "メーカーの削除に失敗しました";
      toast.error(message);
    },
  });
};
