/**
 * ExportButton - 汎用エクスポートボタン (CSV/Excel)
 *
 * Backend APIの `/export/download?format=csv|xlsx` エンドポイントを使用する共通コンポーネント
 */
import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { http } from "@/shared/api/http-client";

interface ExportButtonProps {
  /**
   * エクスポートAPIのパス (例: "/masters/customers/export/download")
   */
  apiPath: string;
  /**
   * ファイル名のプレフィックス (例: "customers")
   * ファイル名は `{prefix}_{YYYY-MM-DD}.{csv|xlsx}` の形式になります
   */
  filePrefix: string;
  /**
   * ボタンサイズ
   */
  size?: "sm" | "default" | "lg";
  /**
   * カスタムクラス名
   */
  className?: string;
}

export function ExportButton({
  apiPath,
  filePrefix,
  size = "default",
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setIsExporting(true);
      const filename = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.${format}`;
      await http.download(`${apiPath}?format=${format}`, filename);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Button
        key="csv"
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
        key="xlsx"
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
