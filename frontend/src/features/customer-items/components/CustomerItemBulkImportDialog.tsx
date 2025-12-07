import { useCallback } from "react";

import { bulkUpsertCustomerItems } from "../api";
import type { CustomerItemBulkRow } from "../types/bulk-operation";
import {
  downloadCSV,
  generateEmptyTemplate,
  parseCustomerItemCsv,
} from "../utils/customer-item-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";
import { useBulkImport } from "@/shared/hooks/useBulkImport";

interface CustomerItemBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerItemBulkImportDialog({
  open,
  onOpenChange,
}: CustomerItemBulkImportDialogProps) {
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
  } = useBulkImport<CustomerItemBulkRow>({
    mutationFn: bulkUpsertCustomerItems,
    queryKey: ["customer-items"],
    onOpenChange,
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Call base handler to set file state
      baseHandleFileChange(e);

      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      try {
        const { rows, errors } = await parseCustomerItemCsv(selectedFile);
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
    downloadCSV(template, "customer_items_template.csv");
  };

  return (
    <BaseBulkImportDialog
      open={open}
      onClose={handleClose}
      title="得意先品番 一括インポート"
      description="CSVファイルを使用して得意先品番を一括登録・更新します。"
      onDownloadTemplate={handleDownloadTemplate}
      onFileChange={handleFileChange}
      file={file}
      parseErrors={parseErrors}
      parsedCounts={{ add: previewRows.length, upd: 0, del: 0 }}
      hasparsedRows={previewRows.length > 0}
      result={importResult}
      onImport={handleImport}
      isPending={isImporting}
    />
  );
}
