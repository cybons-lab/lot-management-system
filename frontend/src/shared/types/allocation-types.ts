/**
 * Allocation-related type definitions
 *
 * This file contains allocation types that are shared across multiple modules
 * to avoid circular dependencies.
 */

export type AllocatedLot = {
  lot_id: number;
  allocated_quantity: number | string | null; // DDL v2.2: DECIMAL(15,3)
  allocated_qty?: number | null; // Deprecated: use allocated_quantity
  allocation_id?: number; // UI参照あり
  delivery_place_code: string | null;
  delivery_place_name: string | null;
  allocation_type?: string;
  lot_number?: string | null;
  status?: string;
};
