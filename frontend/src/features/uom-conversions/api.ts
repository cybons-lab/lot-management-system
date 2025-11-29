/**
 * UOM Conversions API Types
 */

/**
 * Unit of measure conversion record.
 */
export interface UomConversion {
  conversion_id: number;
  product_code: string;
  product_name: string;
  external_unit: string;
  conversion_factor: number;
  remarks?: string | null;
}

export type UomConversionCreate = Omit<UomConversion, "conversion_id">;
export type UomConversionUpdate = Partial<UomConversionCreate>;
