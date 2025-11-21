/**
 * WarehouseExportButton - 倉庫エクスポート
 */
import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import type { Warehouse } from "../api/warehouses-api";
import { warehousesToCSV, downloadCSV } from "../utils/warehouse-csv";

export interface WarehouseExportButtonProps {
  warehouses: Warehouse[];
  size?: "default" | "sm" | "lg";
}

export function WarehouseExportButton({
  warehouses,
  size = "default",
}: WarehouseExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (warehouses.length === 0) return;
    setIsExporting(true);
    try {
      const csv = warehousesToCSV(warehouses, true);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `warehouses_export_${timestamp}.csv`);
    } finally {
      setIsExporting(false);
    }
  }, [warehouses]);

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleExport}
      disabled={isExporting || warehouses.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "エクスポート中..." : "エクスポート"}
    </Button>
  );
}
