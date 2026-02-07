import type { OrderWithLinesResponse } from "@/shared/types/aliases";

// Simplified order schema types (no zod) to pass initial typecheck.
// Replace later with a real validator.
export interface OrderCreate {
  customer_code: string;
  order_no: string;
  order_date?: string | null;
}

export type OrderUpdate = Partial<OrderCreate> & {
  status?: string;
  remarks?: string | null;
};

// OrderDetail is the same as OrderWithLinesResponse from the API
export type OrderDetail = OrderWithLinesResponse;
