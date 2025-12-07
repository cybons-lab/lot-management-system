import { Download, Upload } from "lucide-react";

import { useMasterImport } from "../hooks/useMasterImport";
import type { TemplateGroup } from "../types";

import { ImportResultCard } from "./ImportResultCard";
import { UploadCard } from "./UploadCard";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface MasterImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  group: TemplateGroup;
}

export function MasterImportDialog({ open, onOpenChange, title, group }: MasterImportDialogProps) {
  const {
    file,
    dryRun,
    setDryRun,
    isUploading,
    result,
    isDownloadingTemplate,
    handleFileChange,
    handleImport,
    handleDownloadTemplate,
    handleClear,
  } = useMasterImport();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            専用のExcelテンプレートを使用して、データを一括登録・更新します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* テンプレートダウンロード・アクションバー */}
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div>
              <h4 className="font-medium text-slate-700">テンプレートを取得</h4>
              <p className="text-xs text-slate-500">
                最新のインポート用テンプレートをダウンロードします
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate(group)}
              disabled={isDownloadingTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              テンプレートをダウンロード
            </Button>
          </div>

          {!result ? (
            <UploadCard
              file={file}
              dryRun={dryRun}
              isUploading={isUploading}
              onFileChange={handleFileChange}
              onDryRunChange={setDryRun}
              onImport={handleImport}
              onClear={handleClear}
            />
          ) : (
            <div className="space-y-4">
              <ImportResultCard result={result} />
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClear}>
                  別のファイルをインポート
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
