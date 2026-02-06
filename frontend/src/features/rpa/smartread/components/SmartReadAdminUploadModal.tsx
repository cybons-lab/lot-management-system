import { Download, Upload, X, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

import { useSmartReadAdminUpload } from "../hooks";
import { logger } from "../utils/logger";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SmartReadAdminUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: number | null;
}

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="max-h-[200px] overflow-y-auto rounded-md border p-2">
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center justify-between rounded-md bg-muted p-2 text-sm"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(index)}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface UploadZoneProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function UploadZone({ onFileChange }: UploadZoneProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="admin-file-upload"
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <Upload className="mb-2 h-8 w-8 text-gray-500" />
        <span className="text-sm text-gray-500">
          PDFファイルをクリックまたはドラッグ＆ドロップで選択
        </span>
        <input
          id="admin-file-upload"
          type="file"
          multiple
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />
      </label>
    </div>
  );
}

export function SmartReadAdminUploadModal({
  open,
  onOpenChange,
  configId,
}: SmartReadAdminUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const uploadMutation = useSmartReadAdminUpload();

  const handleUpload = async () => {
    if (!configId || selectedFiles.length === 0) return;
    try {
      const blob = await uploadMutation.mutateAsync({ configId, files: selectedFiles });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `smartread_admin_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      logger.info("管理者用ハイブリッドアップロード完了");
      setSelectedFiles([]);
      onOpenChange(false);
    } catch (error) {
      logger.error("管理者用ハイブリッドアップロード失敗", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>管理者用詳細アップロード (Hybrid)</DialogTitle>
          <DialogDescription>
            CSVデータと詳細JSONデータをまとめてZIPでダウンロードします。
            常に新規タスクとして実行されます。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <UploadZone
            onFileChange={(e) => {
              if (e.target.files) {
                const files = Array.from(e.target.files);
                setSelectedFiles((prev) => [...prev, ...files]);
              }
            }}
          />
          <FileList
            files={selectedFiles}
            onRemove={(idx) => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploadMutation.isPending || !configId}
          >
            {uploadMutation.isPending ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 処理中...
              </span>
            ) : (
              <span className="flex items-center">
                <Download className="mr-2 h-4 w-4" /> アップロードしてダウンロード
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
