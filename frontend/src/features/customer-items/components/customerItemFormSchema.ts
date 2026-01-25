/**
 * CustomerItemForm スキーマ
 * Zod バリデーションスキーマ
 */

import { z } from "zod";

export const customerItemFormSchema = z.object({
  customer_id: z.number().min(1, "得意先を選択してください"),
  customer_part_no: z.string().min(1, "先方品番を入力してください"),
  product_id: z.number().min(1, "製品を選択してください"),
  supplier_id: z.number().nullable(),
  supplier_item_id: z.number().nullable(),
  is_primary: z.boolean(),
  base_unit: z.string().min(1, "基本単位を入力してください"),
  pack_unit: z.string().nullable(),
  pack_quantity: z.number().nullable(),
  special_instructions: z.string().nullable(),
  // OCR→SAP変換用フィールド
  maker_part_no: z.string().nullable(),
  order_category: z.string().nullable(),
  is_procurement_required: z.boolean(),
  shipping_slip_text: z.string().nullable(),
  ocr_conversion_notes: z.string().nullable(),
  // SAPキャッシュフィールド
  sap_supplier_code: z.string().nullable(),
  sap_warehouse_code: z.string().nullable(),
  sap_shipping_warehouse: z.string().nullable(),
  sap_uom: z.string().nullable(),
});

export type CustomerItemFormData = z.infer<typeof customerItemFormSchema>;

export const CUSTOMER_ITEM_FORM_DEFAULTS: CustomerItemFormData = {
  customer_id: 0,
  customer_part_no: "",
  product_id: 0,
  supplier_id: null,
  supplier_item_id: null,
  is_primary: false,
  base_unit: "EA",
  pack_unit: null,
  pack_quantity: null,
  special_instructions: null,
  // OCR→SAP変換用フィールド
  maker_part_no: null,
  order_category: null,
  is_procurement_required: true,
  shipping_slip_text: null,
  ocr_conversion_notes: null,
  // SAPキャッシュフィールド
  sap_supplier_code: null,
  sap_warehouse_code: null,
  sap_shipping_warehouse: null,
  sap_uom: null,
};
