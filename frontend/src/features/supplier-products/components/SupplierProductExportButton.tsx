/**
 * SupplierProductExportButton - 仕入先製品エクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

interface Props {
  size?: "default" | "sm" | "lg";
}

export function SupplierProductExportButton({ size = "default" }: Props) {
  return (
    <ExportButton
      apiPath="/masters/supplier-products/export/download"
      filePrefix="supplier_products"
      size={size}
    />
  );
}
