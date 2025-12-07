/**
 * MastersBulkLoadPage - マスタ一括インポート
 * Excel, JSON, YAMLファイルからマスタデータを一括登録
 */

import { ImportResultCard } from "../components/ImportResultCard";
import { TemplateCard } from "../components/TemplateCard";
import { UploadCard } from "../components/UploadCard";
import { useMasterImport } from "../hooks/useMasterImport";

export function MastersBulkLoadPage() {
  const {
    file,
    dryRun,
    setDryRun,
    isUploading,
    result,
    isDownloadingTemplate,
    handleFileChange,
    handleImport,
    handleDownloadTemplate,
    handleClear,
  } = useMasterImport();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">マスタ一括インポート</h2>
        <p className="mt-1 text-gray-600">
          Excel, JSON, YAMLファイルからマスタデータを一括登録・更新
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UploadCard
          file={file}
          dryRun={dryRun}
          isUploading={isUploading}
          onFileChange={handleFileChange}
          onDryRunChange={setDryRun}
          onImport={handleImport}
          onClear={handleClear}
        />
        <TemplateCard isDownloading={isDownloadingTemplate} onDownload={handleDownloadTemplate} />
      </div>

      {result && <ImportResultCard result={result} />}
    </div>
  );
}
