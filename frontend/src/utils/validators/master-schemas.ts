/**
 * Zod Validation Schemas - Masters
 * マスタデータ関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * 製品スキーマ
 */
export const productSchema = z.object({
  product_code: z.string().min(1, "製品コードは必須です"),
  product_name: z.string().min(1, "製品名は必須です"),
  unit: z.string().optional(),
  category: z.string().optional(),
});

/**
 * 仕入先スキーマ
 */
export const supplierSchema = z.object({
  supplier_code: z.string().min(1, "仕入先コードは必須です"),
  supplier_name: z.string().min(1, "仕入先名は必須です"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

/**
 * 倉庫スキーマ
 */
export const warehouseSchema = z.object({
  warehouse_code: z.string().min(1, "倉庫コードは必須です"),
  warehouse_name: z.string().min(1, "倉庫名は必須です"),
  address: z.string().optional(),
  is_active: z.number().int().min(0).max(1),
});

/**
 * 得意先スキーマ
 */
export const customerSchema = z.object({
  customer_code: z.string().min(1, "得意先コードは必須です"),
  customer_name: z.string().min(1, "得意先名は必須です"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

// Minimal master schema type shims for compile
export type Product = {
  product_code: string;
  product_name: string;
  packaging_qty?: string;
  packaging_unit?: string;
  internal_unit?: string;
  customer_part_no?: string | null;
  maker_part_no?: string | null;
  requires_lot_number?: boolean;
};

export type Customer = {
  customer_code: string;
  customer_name?: string;
  address?: string | null;
};

export type Warehouse = {
  warehouse_code: string;
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean;
};

export type Supplier = {
  supplier_code: string;
  supplier_name: string;
  address?: string | null;
};

/**
 * 型推論
 */
export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
