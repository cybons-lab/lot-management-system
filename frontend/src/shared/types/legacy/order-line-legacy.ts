import type { AllocatedLot } from "../allocation-types";

export interface OrderLineLegacy {
  line_no?: number | null;
  product_code?: string | null;
  product_name?: string | null;
  quantity?: number | string | null; // Deprecated: use order_quantity
  due_date?: string | null; // Deprecated: use delivery_date
  allocated_qty?: number | string | null; // Deprecated: use allocated_quantity
  delivery_place?: string | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  forecast_qty?: number | null;
  forecast_version_no?: number | null;
  status?: string | null;
  customer_code?: string | null;
  customer_name?: string | null;
  supplier_name?: string | null;
  product_internal_unit?: string | null;
  product_external_unit?: string | null;
  product_qty_per_internal_unit?: number | null;

  allocated_lots?: AllocatedLot[];
  delivery_place_allocations?: { delivery_place_code: string; quantity: number }[];
}
