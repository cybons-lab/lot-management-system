/**
 * UomConversionExportButton - 単位換算エクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

interface Props {
  size?: "default" | "sm" | "lg";
}

export function UomConversionExportButton({ size = "default" }: Props) {
  return (
    <ExportButton
      apiPath="/masters/uom-conversions/export/download"
      filePrefix="uom_conversions"
      size={size}
    />
  );
}
