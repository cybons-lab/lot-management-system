/**
 * MastersBulkLoadPage - マスタ一括インポート
 * Excel, JSON, YAMLファイルからマスタデータを一括登録
 * Phase 3: 初期化機能 + 統合UI
 */

import { ImportResultCard } from "../components/ImportResultCard";
import { ResetCard } from "../components/ResetCard";
import { TemplateCard } from "../components/TemplateCard";
import { UploadCard } from "../components/UploadCard";
import { useMasterImport } from "../hooks/useMasterImport";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

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
    <PageContainer>
      <PageHeader
        title="マスタ一括インポート・初期化"
        subtitle="マスタデータの一括登録およびデータベースの初期化を行います"
        className="pb-0"
      />

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">一括インポート</TabsTrigger>
          <TabsTrigger value="reset">初期化</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
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
            <TemplateCard
              isDownloading={isDownloadingTemplate}
              onDownload={handleDownloadTemplate}
            />
          </div>
          {result && <ImportResultCard result={result} />}
        </TabsContent>

        <TabsContent value="reset">
          <ResetCard />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
