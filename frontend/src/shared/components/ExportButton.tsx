/**
 * ExportButton - 汎用エクスポートボタン (CSV/Excel)
 *
 * Backend APIの `/export/download?format=csv|xlsx` エンドポイントを使用する共通コンポーネント
 */
import { FileSpreadsheet } from "lucide-react";
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

  const handleExport = async (format: "xlsx" = "xlsx") => {
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
    <Button
      variant="outline"
      size={size}
      onClick={() => handleExport("xlsx")}
      disabled={isExporting}
      title="Excel形式でダウンロード"
      className={className}
    >
      <FileSpreadsheet className="mr-2 h-4 w-4" />
      Excelエクスポート
    </Button>
  );
}
