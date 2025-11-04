import { useId, useState } from "react";
import { Upload, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ForecastFileUploadCardProps = {
  /** ファイル選択後のハンドラ */
  onUpload?: (file: File) => void;
  /** 追加のクラス名 */
  className?: string;
};

export function ForecastFileUploadCard({ onUpload, className }: ForecastFileUploadCardProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    onUpload?.(file);
    console.log("Uploading file:", file.name);
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">ファイルアップロード</h3>

      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <Label htmlFor={inputId} className="cursor-pointer">
                <span className="text-primary hover:underline">ファイルを選択</span>
                またはドラッグ&ドロップ
              </Label>
              <Input
                id={inputId}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground mt-2">CSV形式のみ対応</p>
            </div>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-primary" />
            <span className="flex-1">{file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              削除
            </Button>
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file} className="w-full">
          アップロード
        </Button>
      </div>
    </div>
  );
}
