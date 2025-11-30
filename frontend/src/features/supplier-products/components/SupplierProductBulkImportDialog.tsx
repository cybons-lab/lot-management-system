/**
 * SupplierProductBulkImportDialog
 * 仕入先商品一括インポートダイアログ
 */

import { Upload } from "lucide-react";

import { bulkUpsertSupplierProducts } from "../api";
import type { SupplierProductBulkRow } from "../types/bulk-operation";

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

export function SupplierProductBulkImportDialog({ open, onOpenChange }: Props) {
  const {
    file,
    parseErrors,
    importResult,
    isImporting,
    handleFileChange,
    handleImport,
    handleClose,
  } = useBulkImport<SupplierProductBulkRow>({
    mutationFn: bulkUpsertSupplierProducts,
    queryKey: ["supplier-products"],
    onOpenChange,
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>仕入先商品一括インポート</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして、仕入先商品を一括登録・更新・削除します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <BulkImportFileUpload
            id="supplier-product-csv-file"
            label="CSVファイル選択"
            hint="※ヘッダー行が必要です: OPERATION, supplier_code, supplier_name, product_code, product_name, order_unit, order_lot_size"
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
