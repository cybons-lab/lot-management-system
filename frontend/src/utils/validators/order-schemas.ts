// Simplified order schema types (no zod) to pass initial typecheck.
// Replace later with a real validator.
export type OrderCreate = {
  customer_code: string;
  order_no: string;
  order_date?: string | null;
};

export type OrderUpdate = Partial<OrderCreate> & {
  status?: string;
  remarks?: string | null;
};

export type OrderDetail = {
  id: number;
  order_no: string;
  customer_code: string;
  order_date?: string | null;
  remarks?: string | null;
};
