/**
 * CustomerExportButton
 * 得意先エクスポートボタン
 */

import { Download } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui";

import type { Customer } from "../api/customers-api";
import { customersToCSV, downloadCSV } from "../utils/customer-csv";

// ============================================
// Props
// ============================================

export interface CustomerExportButtonProps {
  /** エクスポート対象の得意先データ */
  customers: Customer[];
  /** ボタンのサイズ */
  size?: "default" | "sm" | "lg";
}

// ============================================
// Component
// ============================================

export function CustomerExportButton({ customers, size = "default" }: CustomerExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (customers.length === 0) return;

    setIsExporting(true);

    try {
      // OPERATION列を含めてエクスポート（インポートテンプレートとして再利用可能）
      const csv = customersToCSV(customers, true);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `customers_export_${timestamp}.csv`);
    } finally {
      setIsExporting(false);
    }
  }, [customers]);

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleExport}
      disabled={isExporting || customers.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "エクスポート中..." : "エクスポート"}
    </Button>
  );
}
