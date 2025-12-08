import { useQuery } from "@tanstack/react-query";
import { formatOrderCode } from "@/shared/utils/order";

export interface ConfirmedOrderLine {
  line_id: number;
  order_id: number;
  customer_order_no?: string | null;
  order_code: string;
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
      const data = (await response.json()) as ConfirmedOrderLine[];
      return data.map((line) => ({ ...line, order_code: formatOrderCode(line) }));
    },
    refetchInterval: 30000,
  });
}
