import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLayerCode,
  deleteLayerCode,
  getLayerCodes,
  type LayerCodeCreate,
  type LayerCodeUpdate,
  updateLayerCode,
} from "../api";

export const useLayerCodes = () => {
  return useQuery({
    queryKey: ["layer-codes"],
    queryFn: getLayerCodes,
  });
};

export const useCreateLayerCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LayerCodeCreate) => createLayerCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layer-codes"] });
    },
  });
};

export const useUpdateLayerCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: LayerCodeUpdate }) =>
      updateLayerCode(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layer-codes"] });
    },
  });
};

export const useDeleteLayerCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => deleteLayerCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layer-codes"] });
    },
  });
};
