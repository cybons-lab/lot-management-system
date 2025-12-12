/**
 * UomConversionsPageHeader - ページヘッダー部分
 */
import { Plus, Upload } from "lucide-react";

import { UomConversionExportButton } from "./UomConversionExportButton";

import { Button } from "@/components/ui";

interface UomConversionsPageHeaderProps {
  onImportClick: () => void;
  onCreateClick: () => void;
}

export function UomConversionsPageHeader({
  onImportClick,
  onCreateClick,
}: UomConversionsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">単位換算</h1>
        <p className="mt-1 text-sm text-slate-600">製品単位の換算情報を管理します</p>
      </div>
      <div className="flex gap-2">
        <UomConversionExportButton size="sm" />
        <Button variant="outline" size="sm" onClick={onImportClick}>
          <Upload className="mr-2 h-4 w-4" />
          インポート
        </Button>
        <Button size="sm" onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>
    </div>
  );
}
