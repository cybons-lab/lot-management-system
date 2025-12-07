/**
 * MastersBulkLoadPage - マスタ一括インポート
 * Excel, JSON, YAMLファイルからマスタデータを一括登録
 * Phase 3: 初期化機能 + 統合UI
 */

import { ImportResultCard } from "../components/ImportResultCard";
import { ResetCard } from "../components/ResetCard";
import { TemplateCard } from "../components/TemplateCard";
import { UploadCard } from "../components/UploadCard";
import { useDatabaseReset } from "../hooks/useDatabaseReset";
import { useMasterImport } from "../hooks/useMasterImport";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";

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
  const { isResetting, handleResetDatabase } = useDatabaseReset();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">マスタデータ管理</h2>
        <p className="mt-1 text-gray-600">
          マスタデータの一括インポート・初期化を行います
        </p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">一括インポート</TabsTrigger>
          <TabsTrigger value="initialize">初期化</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-6 space-y-6">
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
        </TabsContent>

        <TabsContent value="initialize" className="mt-6">
          <div className="max-w-xl">
            <ResetCard isResetting={isResetting} onReset={handleResetDatabase} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
