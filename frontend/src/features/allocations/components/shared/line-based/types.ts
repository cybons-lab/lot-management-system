import type { OrderWithLinesResponse, OrderLine } from "@/shared/types/aliases";

export type FilterStatus = "all" | "complete" | "shortage" | "over" | "unallocated";

export type ViewMode = "line" | "order";

export type LineWithOrderInfo = {
    id: number;
    line: OrderLine;
    order: OrderWithLinesResponse;
    order_number: string;
    customer_name: string;
    order_date: string;
    order_id: number;
};

export type GroupedOrder = {
    order_id: number;
    order_number: string;
    customer_name: string;
    order_date: string;
    lines: LineWithOrderInfo[];
};
