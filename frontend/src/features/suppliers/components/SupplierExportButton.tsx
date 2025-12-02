/**
 * SupplierExportButton - 仕入先エクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

export interface SupplierExportButtonProps {
  size?: "default" | "sm" | "lg";
}

export function SupplierExportButton({ size = "default" }: SupplierExportButtonProps) {
  return (
    <ExportButton
      apiPath="/masters/suppliers/export/download"
      filePrefix="suppliers"
      size={size}
    />
  );
}
