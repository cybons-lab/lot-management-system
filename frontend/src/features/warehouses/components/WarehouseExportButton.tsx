/**
 * WarehouseExportButton - 倉庫エクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

export interface WarehouseExportButtonProps {
  size?: "default" | "sm" | "lg";
}

export function WarehouseExportButton({ size = "default" }: WarehouseExportButtonProps) {
  return (
    <ExportButton
      apiPath="/masters/warehouses/export/download"
      filePrefix="warehouses"
      size={size}
    />
  );
}
