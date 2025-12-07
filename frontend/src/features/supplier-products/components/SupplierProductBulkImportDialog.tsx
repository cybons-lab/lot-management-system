/**
 * SupplierProductBulkImportDialog
 * 仕入先商品一括インポートダイアログ
 */

import { useCallback } from "react";

import { bulkUpsertSupplierProducts } from "../api";
import type { SupplierProductBulkRow } from "../types/bulk-operation";
import {
  downloadCSV,
  generateSupplierProductTemplateCsv,
  parseSupplierProductCsv,
} from "../utils/supplier-product-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";
import { useBulkImport } from "@/shared/hooks/useBulkImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierProductBulkImportDialog({ open, onOpenChange }: Props) {
  const {
    file,
    previewRows,
    parseErrors,
    importResult,
    isImporting,
    handleFileChange: baseHandleFileChange,
    handleImport,
    handleClose,
    setPreviewRows,
    setParseErrors,
  } = useBulkImport<SupplierProductBulkRow>({
    mutationFn: bulkUpsertSupplierProducts,
    queryKey: ["supplier-products"],
    onOpenChange,
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      baseHandleFileChange(e);
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      try {
        // Read file content and parse
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const { rows, errors } = parseSupplierProductCsv(text);
          setPreviewRows(rows);
          setParseErrors(errors);
        };
        reader.readAsText(selectedFile);
      } catch {
        setParseErrors(["CSVファイルの読み込み中にエラーが発生しました"]);
      }
    },
    [baseHandleFileChange, setPreviewRows, setParseErrors],
  );

  const handleDownloadTemplate = () => {
    const template = generateSupplierProductTemplateCsv();
    downloadCSV(template, "supplier_products_template.csv");
  };

  const parsedCounts = {
    add: previewRows.filter((r) => r.OPERATION === "ADD").length,
    upd: previewRows.filter((r) => r.OPERATION === "UPD").length,
    del: previewRows.filter((r) => r.OPERATION === "DEL").length,
  };

  return (
    <BaseBulkImportDialog
      open={open}
      onClose={handleClose}
      title="仕入先商品一括インポート"
      description="CSVファイルをアップロードして、仕入先商品を一括登録・更新・削除します。"
      onDownloadTemplate={handleDownloadTemplate}
      onFileChange={handleFileChange}
      file={file}
      parseErrors={parseErrors}
      parsedCounts={parsedCounts}
      hasparsedRows={previewRows.length > 0}
      result={importResult}
      onImport={handleImport}
      isPending={isImporting}
    />
  );
}
