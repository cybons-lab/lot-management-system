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
    mutationFn: ({ file, targetMonth }: { file: File; targetMonth?: string }) =>
      materialOrderForecastsApi.importCsv(file, targetMonth),
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
