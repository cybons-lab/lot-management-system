import { useQuery } from "@tanstack/react-query";

import { getForecasts } from "@/features/forecasts/api";
import type { Forecast } from "@/features/forecasts/api";

export function useForecastData(
  customerId?: number | null,
  deliveryPlaceId?: number | null,
  productId?: number | null,
) {
  return useQuery({
    queryKey: ["forecasts", customerId, deliveryPlaceId, productId],
    queryFn: () =>
      getForecasts({
        customer_id: customerId ?? undefined,
        delivery_place_id: deliveryPlaceId ?? undefined,
        product_id: productId ?? undefined,
        limit: 100, // 十分な数を取得
      }),
    enabled: !!customerId && !!productId,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
    select: (data) => {
      // 全グループのforecastsを結合
      const allForecasts: Forecast[] = data.items.flatMap((item) => item.forecasts ?? []);

      // 日付順にソート
      return allForecasts.sort(
        (a, b) => new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime(),
      );
    },
  });
}
