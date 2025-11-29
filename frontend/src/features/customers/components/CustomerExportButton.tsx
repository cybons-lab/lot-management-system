/**
 * CustomerExportButton - 得意先エクスポート (Backend API)
 */
import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";

import { http } from "@/shared/api/http-client";
import {
  Button,
} from "@/components/ui";

interface Props {
  size?: "sm" | "default";
}

export function CustomerExportButton({ size = "default" }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setIsExporting(true);
      const filename = `customers_${new Date().toISOString().slice(0, 10)}.${format}`;
      await http.download(`/masters/customers/export/download?format=${format}`, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size={size}
        onClick={() => handleExport("csv")}
        disabled={isExporting}
        title="CSV形式でダウンロード"
      >
        <FileText className="mr-2 h-4 w-4" />
        CSV
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={() => handleExport("xlsx")}
        disabled={isExporting}
        title="Excel形式でダウンロード"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
