/**
 * ProductExportButton - 商品エクスポート (Backend API)
 */
import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { http } from "@/shared/api/http-client";

interface Props {
  size?: "sm" | "default";
}

export function ProductExportButton({ size = "default" }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setIsExporting(true);
      const filename = `products_${new Date().toISOString().slice(0, 10)}.${format}`;
      await http.download(`/masters/products/export/download?format=${format}`, filename);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("エクスポートに失敗しました");
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
