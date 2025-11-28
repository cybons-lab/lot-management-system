import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationApi } from "@/shared/api/integration";

export function useSAPBatchRegistration() {
  const queryClient = useQueryClient();

  const { mutate: registerToSAP, isPending: isRegistering } = useMutation({
    mutationFn: async (lineIds: number[]) => {
      const response = await integrationApi.registerSalesOrders({
        order_ids: lineIds, // API仕様: order_idsだが実際はline_idsとして扱う
      });
      return response;
    },
    onSuccess: (data) => {
      toast.success(`SAP登録完了: ${data.registered_count}件`);
      queryClient.invalidateQueries({ queryKey: ["confirmed-order-lines"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
    onError: () => {
      toast.error("SAP登録に失敗しました");
    },
  });

  return { registerToSAP, isRegistering };
}
