/**
 * UomConversionBulkImportDialog
 * 単位換算一括インポートダイアログ
 */

import { Upload } from "lucide-react";

import { bulkUpsertUomConversions } from "../api";
import type { UomConversionBulkRow } from "../types/bulk-operation";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/layout/dialog";
import {
  BulkImportFileUpload,
  BulkImportErrorList,
  BulkImportResult,
} from "@/shared/components/bulk-import";
import { useBulkImport } from "@/shared/hooks/useBulkImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UomConversionBulkImportDialog({ open, onOpenChange }: Props) {
  const {
    file,
    parseErrors,
    importResult,
    isImporting,
    handleFileChange,
    handleImport,
    handleClose,
  } = useBulkImport<UomConversionBulkRow>({
    mutationFn: bulkUpsertUomConversions,
    queryKey: ["uom-conversions"],
    onOpenChange,
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>単位換算一括インポート</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして、単位換算を一括登録します。（更新・削除は現在未対応）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <BulkImportFileUpload
            id="uom-conversion-csv-file"
            label="CSVファイル選択"
            hint="※ヘッダー行が必要です: OPERATION, product_code, product_name, external_unit, conversion_factor, remarks"
            onFileChange={handleFileChange}
            disabled={isImporting}
          />

          <BulkImportErrorList errors={parseErrors} />

          {importResult && <BulkImportResult result={importResult} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {importResult ? "閉じる" : "キャンセル"}
          </Button>
          {!importResult && (
            <Button onClick={handleImport} disabled={!file || isImporting}>
              {isImporting && <Upload className="mr-2 h-4 w-4 animate-spin" />}
              {!isImporting && <Upload className="mr-2 h-4 w-4" />}
              インポート実行
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
