/**
 * UOM Conversions API Types
 */

export interface UomConversionResponse {
  conversion_id: number;
  product_code: string;
  product_name: string;
  external_unit: string;
  conversion_factor: number;
  remarks?: string;
}

export type UomConversionCreate = Omit<UomConversionResponse, "conversion_id" | "product_name">;
export type UomConversionUpdate = Partial<UomConversionCreate>;
