/**
 * 一括インポートダイアログベースコンポーネント
 *
 * Excelファイルからのマスタデータ一括登録機能を提供します。
 * テンプレートダウンロード、ファイル選択、パース、インポート実行の
 * 一連の操作を管理します。
 */

import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/layout/dialog";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

/**
 * 一括操作の件数集計
 */
export interface BulkCounts {
  /** 追加件数 */
  add: number;
  /** 更新件数 */
  upd: number;
  /** 削除件数 */
  del: number;
}

/**
 * BaseBulkImportDialogコンポーネントのProps
 */
interface BaseBulkImportDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログを閉じる処理 */
  onClose: () => void;
  /** ダイアログタイトル */
  title: string;
  /** ダイアログ説明文 */
  description: string;
  /** テンプレートダウンロード処理 */
  onDownloadTemplate: () => void;
  /** ファイル選択時の処理 */
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 選択されたファイル */
  file: File | null;
  /** パースエラーメッセージリスト */
  parseErrors: string[];
  /** パース済みデータの件数集計 */
  parsedCounts: BulkCounts;
  /** パース済み行が存在するかどうか */
  hasparsedRows: boolean;
  /** インポート実行結果 */
  result: BulkUpsertResponse | null;
  /** インポート実行処理 */
  onImport: () => void;
  /** インポート処理中かどうか */
  isPending: boolean;
}

/**
 * 一括インポートダイアログ
 *
 * @param props - コンポーネントプロパティ
 * @returns 一括インポートダイアログコンポーネント
 */
export function BaseBulkImportDialog({
  open,
  onClose,
  title,
  description,
  onDownloadTemplate,
  onFileChange,
  file,
  parseErrors,
  parsedCounts,
  hasparsedRows,
  result,
  onImport,
  isPending,
}: BaseBulkImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={onDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            テンプレートをダウンロード
          </Button>

          <div className="rounded-lg border-2 border-dashed p-4 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={onFileChange}
              className="hidden"
              id="bulk-excel-input"
            />
            <label htmlFor="bulk-excel-input" className="cursor-pointer">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {file ? file.name : "Excelファイルを選択"}
              </p>
            </label>
          </div>

          <ErrorList errors={parseErrors} />

          {hasparsedRows && parseErrors.length === 0 && <SummaryInfo counts={parsedCounts} />}

          {result && <ResultStatus result={result} />}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              onClick={onImport}
              disabled={isPending || !hasparsedRows || parseErrors.length > 0}
            >
              {isPending ? "処理中..." : "インポート実行"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-lg bg-red-50 p-3">
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">エラー</span>
      </div>
      <ul className="mt-2 list-inside list-disc text-sm text-red-600">
        {errors.map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryInfo({ counts }: { counts: BulkCounts }) {
  return (
    <div className="rounded-lg bg-blue-50 p-3">
      <p className="text-sm text-blue-600">
        {counts.add}件追加、{counts.upd}件更新、{counts.del}件削除
      </p>
    </div>
  );
}

function ResultStatus({ result }: { result: BulkUpsertResponse }) {
  return (
    <div
      className={`rounded-lg p-3 ${
        result.status === "success"
          ? "bg-green-50"
          : result.status === "partial"
            ? "bg-yellow-50"
            : "bg-red-50"
      }`}
    >
      <div className="flex items-center gap-2">
        {result.status === "success" ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        )}
        <span className="font-medium">{result.status === "success" ? "完了" : "一部失敗"}</span>
      </div>
      <p className="mt-1 text-sm">
        追加: {result.summary.created}, 更新: {result.summary.updated}, 失敗:{" "}
        {result.summary.failed}
      </p>
    </div>
  );
}
