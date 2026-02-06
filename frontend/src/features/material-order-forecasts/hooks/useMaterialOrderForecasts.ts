import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { materialOrderForecastsApi, type GetForecastsParams } from "../api";

export const forecastKeys = {
  all: ["material-order-forecasts"] as const,
  lists: () => [...forecastKeys.all, "list"] as const,
  list: (params?: GetForecastsParams) => [...forecastKeys.lists(), { params }] as const,
};

export const useMaterialOrderForecasts = (params?: GetForecastsParams) => {
  return useQuery({
    queryKey: forecastKeys.list(params),
    queryFn: () => materialOrderForecastsApi.getForecasts(params),
  });
};

export const useImportMaterialOrderForecast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: { file: File }) => materialOrderForecastsApi.importCsv(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.all });
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(
          `${data.imported_count}件をインポートしましたが、${data.warnings.length}件の警告があります`,
        );
      } else {
        toast.success(`${data.imported_count}件をインポートしました`);
      }
    },
    onError: (error: Error) => {
      const message = error.message || "インポートに失敗しました";
      toast.error(message);
    },
  });
};

export const useDeleteMaterialOrderForecast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => materialOrderForecastsApi.deleteForecast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.all });
      toast.success("フォーキャストを削除しました");
    },
    onError: (error: Error) => {
      toast.error(error.message || "削除に失敗しました");
    },
  });
};

export const useDeleteMaterialOrderForecastsByMonth = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetMonth: string) =>
      materialOrderForecastsApi.deleteForecastsByTargetMonth(targetMonth),
    onSuccess: (_, targetMonth) => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.all });
      toast.success(`${targetMonth} のフォーキャストを削除しました`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "対象月データの削除に失敗しました");
    },
  });
};
