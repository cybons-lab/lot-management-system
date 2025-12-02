import { BulkUpsertResponse } from "@/shared/types/bulk-operations";

export type { BulkUpsertResponse };

export interface CustomerItemBulkRow {
  customer_code: string;
  external_product_code: string;
  product_code: string;
  supplier_code?: string;
  base_unit: string;
  pack_unit?: string;
  pack_quantity?: number;
  special_instructions?: string;
  _rowNumber?: number;
}
