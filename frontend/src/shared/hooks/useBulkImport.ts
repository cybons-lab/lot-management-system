import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

interface UseBulkImportOptions<TRow> {
  mutationFn: (rows: TRow[]) => Promise<BulkUpsertResponse>;
  queryKey: string[];
  onOpenChange: (open: boolean) => void;
}

/**
 * 一括インポートの共通ロジックを管理するカスタムフック
 */
export function useBulkImport<TRow>({
  mutationFn,
  queryKey,
  onOpenChange,
}: UseBulkImportOptions<TRow>) {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<TRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<BulkUpsertResponse | null>(null);

  const queryClient = useQueryClient();

  const { mutate: executeImport, isPending: isImporting } = useMutation({
    mutationFn,
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey });

      if (result.status === "success") {
        toast.success(`${result.summary.total}件の処理が完了しました`);
      } else if (result.status === "partial") {
        toast.warning(`${result.summary.total}件中${result.summary.failed}件が失敗しました`);
      } else {
        toast.error("すべての処理が失敗しました");
      }
    },
    onError: () => {
      toast.error("インポート中にエラーが発生しました");
    },
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);
    setParseErrors([]);
    setPreviewRows([]);

    // Note: CSV parsing should be handled by the parent component or passed as a callback
    // For now, we just set the file. The actual parsing logic is expected to be executed
    // by the component using this hook, which then sets the previewRows.
    // However, the current interface of this hook doesn't expose setPreviewRows.
    // We might need to adjust the hook interface or usage pattern.
  }, []);

  const handleImport = useCallback(() => {
    if (previewRows.length === 0 || parseErrors.length > 0) return;
    executeImport(previewRows);
  }, [previewRows, parseErrors, executeImport]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setFile(null);
      setPreviewRows([]);
      setParseErrors([]);
      setImportResult(null);
    }, 300);
  }, [onOpenChange]);

  return {
    file,
    previewRows,
    parseErrors,
    importResult,
    isImporting,
    handleFileChange,
    handleImport,
    handleClose,
    setPreviewRows,
    setParseErrors,
  };
}
