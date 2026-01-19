import { useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api/http-client";

export interface MasterStatusResponse {
  unmapped_customer_items_count: number;
  unmapped_products_count: number;
  unmapped_customer_item_delivery_settings_count: number;
  current_user_has_primary_assignments: boolean;
}

export const useMasterStatus = () => {
  return useQuery({
    queryKey: ["masters", "status"],
    queryFn: async (): Promise<MasterStatusResponse> => {
      return await http.get<MasterStatusResponse>("masters/status");
    },
    // ステータスは頻繁に変わるものではないので、少し長めのキャッシュ時間を設定
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
