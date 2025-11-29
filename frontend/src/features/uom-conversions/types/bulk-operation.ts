/**
 * Bulk Operation Types for UOM Conversions
 */

import type {
    BulkOperationType,
    BulkRowBase,
    BulkResultRow,
    BulkUpsertResponse,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

export interface UomConversionBulkRow extends BulkRowBase {
    product_code: string;
    product_name: string;
    external_unit: string;
    conversion_factor: number;
    remarks?: string;
}
