import { useQuery } from "@tanstack/react-query";

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
            const response = await fetch("/api/orders/confirmed-order-lines");
            if (!response.ok) throw new Error("Failed to fetch confirmed lines");
            return response.json();
        },
        refetchInterval: 30000,
    });
}
