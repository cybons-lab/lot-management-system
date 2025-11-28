import { useQuery } from "@tanstack/react-query";

import { api } from "@/shared/api/client";

export interface ConfirmedOrderLine {
    line_id: number;
    order_id: number;
    order_number: string;
    customer_id: number;
    customer_name: string;
    product_id: number;
    product_code: string;
    product_name: string;
    order_quantity: number;
    allocated_quantity: number;
    unit: string;
    delivery_date: string;
    sap_order_no?: string | null;
}

export function useConfirmedOrderLines() {
    return useQuery<ConfirmedOrderLine[]>({
        queryKey: ["confirmed-order-lines"],
        queryFn: async () => {
            const response = await api.get("/api/orders/confirmed-lines");
            return response.data;
        },
        refetchInterval: 30000, // 30秒ごとに更新
    });
}
