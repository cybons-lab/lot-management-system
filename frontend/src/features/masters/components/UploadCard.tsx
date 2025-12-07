/**
 * UploadCard - ファイルアップロードカード
 */

import { FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Button, Input, Label, Checkbox } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

const ACCEPTED_FILE_TYPES = ".xlsx,.json,.yaml,.yml";
const ACCEPTED_FILE_TYPES_DISPLAY = "Excel (.xlsx), JSON (.json), YAML (.yaml, .yml)";

interface UploadCardProps {
  file: File | null;
  dryRun: boolean;
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDryRunChange: (checked: boolean) => void;
  onImport: () => void;
  onClear: () => void;
}

export function UploadCard(props: UploadCardProps) {
  const { file, dryRun, isUploading, onFileChange, onDryRunChange, onImport, onClear } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          ファイルアップロード
        </CardTitle>
        <CardDescription>
          仕入先・商品・得意先・配送先・得意先商品を一括でインポートできます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FileUploadArea file={file} isUploading={isUploading} onFileChange={onFileChange} />
        <DryRunCheckbox dryRun={dryRun} isUploading={isUploading} onChange={onDryRunChange} />
        <ActionButtons
          file={file}
          dryRun={dryRun}
          isUploading={isUploading}
          onImport={onImport}
          onClear={onClear}
        />
        <CsvInfoBox />
      </CardContent>
    </Card>
  );
}

function FileUploadArea(props: {
  file: File | null;
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="import-file">ファイル選択</Label>
      <div className="rounded-lg border-2 border-dashed p-6 text-center">
        <Input
          id="import-file"
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={props.onFileChange}
          className="hidden"
          disabled={props.isUploading}
        />
        <label htmlFor="import-file" className="cursor-pointer">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {props.file ? props.file.name : "クリックしてファイルを選択"}
          </p>
          <p className="mt-1 text-xs text-gray-400">{ACCEPTED_FILE_TYPES_DISPLAY}</p>
        </label>
      </div>
    </div>
  );
}

function DryRunCheckbox(props: { dryRun: boolean; isUploading: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="dry-run"
        checked={props.dryRun}
        onCheckedChange={(checked) => props.onChange(checked === true)}
        disabled={props.isUploading}
      />
      <Label htmlFor="dry-run" className="cursor-pointer">
        ドライラン（検証のみ、実際にはインポートしない）
      </Label>
    </div>
  );
}

function ActionButtons(props: {
  file: File | null;
  dryRun: boolean;
  isUploading: boolean;
  onImport: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button onClick={props.onImport} disabled={!props.file || props.isUploading} className="flex-1">
        {props.isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            処理中...
          </>
        ) : props.dryRun ? (
          "検証実行"
        ) : (
          "インポート実行"
        )}
      </Button>
      <Button variant="outline" onClick={props.onClear} disabled={props.isUploading}>
        クリア
      </Button>
    </div>
  );
}

function CsvInfoBox() {
  return (
    <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
      <p className="font-medium">CSVファイルについて</p>
      <p className="mt-1 text-blue-600">
        CSVファイルは文字コードの問題が発生しやすいため、Excelファイル(.xlsx)の使用を推奨します。
      </p>
    </div>
  );
}
