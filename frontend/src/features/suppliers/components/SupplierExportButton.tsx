/**
 * SupplierExportButton - 仕入先CSVエクスポート
 */
import { useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui";
import type { Supplier } from "../api/suppliers-api";
import { generateSupplierCsv } from "../utils/supplier-csv";

interface Props {
  suppliers: Supplier[];
  size?: "sm" | "default";
}

export function SupplierExportButton({ suppliers, size = "default" }: Props) {
  const handleExport = useCallback(() => {
    const csv = generateSupplierCsv(suppliers);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [suppliers]);

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={suppliers.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      エクスポート
    </Button>
  );
}
