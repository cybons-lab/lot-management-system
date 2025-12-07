// 一括インポートダイアログのフォームとプレビューUIを共通化
import { useCallback } from "react";

import { bulkUpsertUomConversions } from "../api";
import type { UomConversionBulkRow } from "../types/bulk-operation";
import {
  downloadCSV,
  generateEmptyTemplate,
  parseUomConversionCsv,
} from "../utils/uom-conversion-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";
import { useBulkImport } from "@/shared/hooks/useBulkImport";

interface UomConversionBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UomConversionBulkImportDialog({
  open,
  onOpenChange,
}: UomConversionBulkImportDialogProps) {
  // fileInputRef removed

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
  } = useBulkImport<UomConversionBulkRow>({
    mutationFn: bulkUpsertUomConversions,
    queryKey: ["uom-conversions"],
    onOpenChange,
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      baseHandleFileChange(e);
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      try {
        const { rows, errors } = await parseUomConversionCsv(selectedFile);
        setPreviewRows(rows);
        setParseErrors(errors);
      } catch {
        setParseErrors(["CSVファイルの読み込み中にエラーが発生しました"]);
      }
    },
    [baseHandleFileChange, setPreviewRows, setParseErrors],
  );

  const handleDownloadTemplate = () => {
    const template = generateEmptyTemplate();
    downloadCSV(template, "uom_conversions_template.csv");
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
      title="単位変換マスタ 一括インポート"
      description="CSVファイルを使用して単位変換設定を一括登録・更新します。"
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
