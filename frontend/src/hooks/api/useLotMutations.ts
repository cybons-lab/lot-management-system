import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as lotService from "@/services/api/lot-service";
import type { LotCreateInput, LotUpdateInput } from "@/utils/validators";

export const useLotMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: LotCreateInput) => lotService.createLot(data),
    onSuccess: () => {
      toast.success("ロットを作成しました");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
    },
    onError: (error: Error) => {
      toast.error(`ロットの作成に失敗しました: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LotUpdateInput }) =>
      lotService.updateLot(id, data),
    onSuccess: () => {
      toast.success("ロットを更新しました");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
    },
    onError: (error: Error) => {
      toast.error(`ロットの更新に失敗しました: ${error.message}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => lotService.archiveLot(id),
    onSuccess: () => {
      toast.success("ロットをアーカイブしました");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
    },
    onError: (error: Error) => {
      toast.error(`ロットのアーカイブに失敗しました: ${error.message}`);
    },
  });

  // Lock/Unlock/Delete implemented similarly if needed

  return {
    createLot: createMutation.mutateAsync,
    updateLot: updateMutation.mutateAsync,
    archiveLot: archiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
};
