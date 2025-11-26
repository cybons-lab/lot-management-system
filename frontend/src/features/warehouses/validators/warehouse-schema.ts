/**
 * Zod Validation Schemas - Warehouses
 * 倉庫関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * 倉庫スキーマ
 */
export const warehouseSchema = z.object({
  warehouse_code: z.string().min(1, "倉庫コードは必須です"),
  warehouse_name: z.string().min(1, "倉庫名は必須です"),
  address: z.string().optional(),
  is_active: z.number().int().min(0).max(1),
});

export type Warehouse = {
  warehouse_code: string;
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean;
};

/**
 * 型推論
 */
export type WarehouseInput = z.infer<typeof warehouseSchema>;
