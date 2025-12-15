/**
 * ProductExportButton - 製品エクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

export interface ProductExportButtonProps {
  size?: "default" | "sm" | "lg";
}

export function ProductExportButton({ size = "default" }: ProductExportButtonProps) {
  return (
    <ExportButton apiPath="/masters/products/export/download" filePrefix="products" size={size} />
  );
}
