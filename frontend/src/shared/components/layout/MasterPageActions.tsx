/**
 * MasterPageActions - マスタページ共通アクションボタン
 *
 * 全マスタページで使用する統一されたアクションボタンを提供。
 * - Excelエクスポート
 * - インポート
 * - 新規登録
 */
import { FileSpreadsheet, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { http } from "@/shared/api/http-client";

export interface MasterPageActionsProps {
  /** エクスポートAPIパス (例: /masters/customers/export/download) */
  exportApiPath?: string;
  /** エクスポートファイル名プレフィックス (例: customers) */
  exportFilePrefix?: string;
  /** インポートダイアログを開くハンドラ */
  onImportClick?: () => void;
  /** 新規登録ダイアログを開くハンドラ */
  onCreateClick: () => void;
  /** 新規登録ボタンのラベル (デフォルト: "新規登録") */
  createLabel?: string;
  /** ボタンサイズ */
  size?: "sm" | "default";
}

export function MasterPageActions({
  exportApiPath,
  exportFilePrefix,
  onImportClick,
  onCreateClick,
  createLabel = "新規登録",
  size = "sm",
}: MasterPageActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exportApiPath || !exportFilePrefix) return;

    try {
      setIsExporting(true);
      const filename = `${exportFilePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      await http.download(`${exportApiPath}?format=xlsx`, filename);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* エクスポート */}
      {exportApiPath && (
        <Button
          variant="outline"
          size={size}
          onClick={handleExport}
          disabled={isExporting}
          title="Excel形式でダウンロード"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excelエクスポート
        </Button>
      )}

      {/* インポート */}
      {onImportClick && (
        <Button variant="outline" size={size} onClick={onImportClick}>
          <Upload className="mr-2 h-4 w-4" />
          インポート
        </Button>
      )}

      {/* 新規登録 */}
      <Button size={size} onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        {createLabel}
      </Button>
    </div>
  );
}
