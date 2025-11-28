import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationApi } from "@/shared/api/integration";

interface SAPRegistrationResult {
    orderId: number;
    sapOrderNo: string;
    registeredAt: string;
}

export function useSAPRegistration(orderId: number) {
    const [sapOrderNo, setSapOrderNo] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { mutate: registerToSAP, isPending: isRegistering } = useMutation({
        mutationFn: async () => {
            const response = await integrationApi.registerSalesOrders({
                order_ids: [orderId],
            });

            if (response.status === "success" && response.results.length > 0) {
                const result = response.results[0];
                return {
                    orderId: result.order_id,
                    sapOrderNo: result.sap_order_no,
                    registeredAt: new Date().toISOString(),
                };
            }
            throw new Error("Registration failed");
        },
        onSuccess: (result: SAPRegistrationResult) => {
            setSapOrderNo(result.sapOrderNo);
            toast.success("SAP登録完了", {
                description: `SAP受注番号: ${result.sapOrderNo}`,
            });

            // Invalidate related queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["forecasts"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
        onError: (error) => {
            console.error("SAP registration failed:", error);
            toast.error("SAP登録に失敗しました");
        },
    });

    return {
        sapOrderNo,
        registerToSAP,
        isRegistering,
    };
}
